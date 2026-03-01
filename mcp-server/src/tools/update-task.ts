/**
 * update_task tool
 * Update a task - mark complete, uncomplete, or add notes
 */

import {
  updateTaskStatus,
  readVaultFile,
  writeVaultFile,
  appendToVaultFile,
  fileExists,
} from "../utils/vault.js";
import { regenerateToc } from "../utils/toc.js";

interface UpdateTaskArgs {
  task: string;
  action: "complete" | "uncomplete" | "add_note";
  content?: string;
}

export async function updateTask(
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[] }> {
  const { task, action, content } = args as UpdateTaskArgs;

  if (!task) {
    return {
      content: [
        {
          type: "text",
          text: "## Error\n\nMissing required parameter: task",
        },
      ],
    };
  }

  if (!action) {
    return {
      content: [
        {
          type: "text",
          text: "## Error\n\nMissing required parameter: action",
        },
      ],
    };
  }

  let md = `## Task Updated: [[${task}]]\n\n`;

  if (action === "complete" || action === "uncomplete") {
    const completed = action === "complete";
    const updated = await updateTaskStatus(task, completed);

    if (updated) {
      md += `**Action**: Marked as ${completed ? "completed" : "not completed"}\n\n`;
      md += `### Tasks/Main.md Updated\n`;
      md += "```diff\n";
      if (completed) {
        md += `- - [ ] [[${task}]]\n`;
        md += `+ - [x] [[${task}]]\n`;
      } else {
        md += `- - [x] [[${task}]]\n`;
        md += `+ - [ ] [[${task}]]\n`;
      }
      md += "```\n";
    } else {
      md += `**Note**: Task not found in Tasks/Main.md or already in desired state.\n`;
    }
  } else if (action === "add_note") {
    if (!content) {
      return {
        content: [
          {
            type: "text",
            text: "## Error\n\nMissing required parameter: content (required for add_note action)",
          },
        ],
      };
    }

    const taskFile = `Tasks/${task}.md`;
    const exists = await fileExists(taskFile);

    if (exists) {
      // Append note with timestamp
      const { getTimezone } = await import("../utils/vault.js");
      const timestamp = new Date().toLocaleString("en-US", {
        timeZone: getTimezone(),
      });
      const noteText = `\n\n---\n\n**Note added ${timestamp}**:\n\n${content}`;
      await appendToVaultFile(taskFile, noteText);

      md += `**Action**: Added note to task file\n\n`;
      md += `### Added Content\n\n`;
      md += "```\n";
      md += `---\n\n**Note added ${timestamp}**:\n\n${content}\n`;
      md += "```\n";
    } else {
      md += `**Error**: Task file \`${taskFile}\` not found.\n\n`;
      md += `### Suggestion\n`;
      md += `Create the task file first, or check the task name spelling.\n`;
    }
  } else {
    return {
      content: [
        {
          type: "text",
          text: `## Error\n\nUnknown action: ${action}. Valid actions: complete, uncomplete, add_note`,
        },
      ],
    };
  }

  // Regenerate TOC after write
  await regenerateToc();

  return {
    content: [{ type: "text", text: md }],
  };
}
