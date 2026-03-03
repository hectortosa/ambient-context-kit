/**
 * run_workflow tool
 * Execute vault workflows (today, eob, eow) remotely via MCP
 */

import { invokeClaude } from "../claude-cli.js";

interface RunWorkflowArgs {
  workflow: "today" | "eob" | "eow";
  dry_run?: boolean;
}

// Map workflow names to skill commands
const WORKFLOW_COMMANDS: Record<string, string> = {
  today: "/today",
  eob: "/end-of-business-day",
  eow: "/end-of-week",
};

const WORKFLOW_LABELS: Record<string, string> = {
  today: "Morning Startup",
  eob: "End of Business Day",
  eow: "End of Week",
};

// Concurrency guard - only one workflow at a time
let activeWorkflow: string | null = null;

export async function runWorkflow(
  args: Record<string, unknown>,
): Promise<{ content: { type: string; text: string }[] }> {
  const { workflow, dry_run = false } = args as RunWorkflowArgs;

  if (!workflow || !WORKFLOW_COMMANDS[workflow]) {
    return {
      content: [
        {
          type: "text",
          text: `## Error\n\nInvalid workflow: "${workflow}". Must be one of: today, eob, eow`,
        },
      ],
    };
  }

  // Concurrency guard
  if (activeWorkflow) {
    return {
      content: [
        {
          type: "text",
          text: `## Workflow Busy\n\nAnother workflow is already running: **${WORKFLOW_LABELS[activeWorkflow]}**.\n\nPlease wait for it to complete before starting another.`,
        },
      ],
    };
  }

  const label = WORKFLOW_LABELS[workflow];
  const command = WORKFLOW_COMMANDS[workflow];

  activeWorkflow = workflow;

  try {
    let prompt = command;

    if (dry_run) {
      prompt +=
        "\n\nIMPORTANT: This is a DRY RUN / PREVIEW ONLY. Analyze and present what changes would be made, but DO NOT execute any changes. Do not create, modify, move, or delete any files.";
    }

    const result = await invokeClaude({
      prompt,
      timeout: 1500000, // 15 minutes - workflows are heavy
    });

    let md = `## ${label}${dry_run ? " (Dry Run)" : ""}\n\n`;

    if (result.success) {
      md += result.output;
    } else {
      md += `### Workflow Failed\n\n`;
      md += `**Error**: ${result.error}\n`;
      if (result.output) {
        md += `\n**Partial output**:\n\n${result.output}\n`;
      }
    }

    return {
      content: [{ type: "text", text: md }],
    };
  } finally {
    activeWorkflow = null;
  }
}
