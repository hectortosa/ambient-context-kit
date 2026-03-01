/**
 * Ambient Context Tools
 *
 * These tools connect to your persistent Ambient Context - a knowledge system
 * that captures work context, research, architecture decisions, and ongoing projects.
 *
 * USE THESE TOOLS PROACTIVELY to:
 * - Check what's already known before researching
 * - Capture discoveries and decisions as you work
 * - Maintain continuity across all Claude sessions
 * - Keep your context up-to-date automatically
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { listToc } from "./list-toc.js";
import { listTasks } from "./list-tasks.js";
import { getMemory } from "./get-memory.js";
import { addQuickNote } from "./add-quick-note.js";
import { updateTask } from "./update-task.js";
import { findContext } from "./find-context.js";
import { readNote } from "./read-note.js";
import { prepareMeeting } from "./prepare-meeting.js";
import { updateMeetingNote } from "./update-meeting-note.js";
import { runWorkflow } from "./run-workflow.js";
import { saveMemory } from "./save-memory.js";

// Tool definitions for MCP protocol
const toolDefinitions: Tool[] = [
  {
    name: "list_toc",
    description:
      "Browse the Ambient Context index to see what information is already captured. Use this FIRST when starting work to check existing context about tasks, people/companies, research topics, and ongoing projects.",
    inputSchema: {
      type: "object",
      properties: {
        section: {
          type: "string",
          enum: ["tasks", "memory", "research", "writing", "all"],
          description:
            "Filter to a specific section. Defaults to 'all'.",
        },
      },
    },
  },
  {
    name: "list_tasks",
    description:
      "View your current task list - what's due today, this week, and ongoing projects. Check this when helping with work planning or when a task mentioned might already be tracked.",
    inputSchema: {
      type: "object",
      properties: {
        section: {
          type: "string",
          enum: ["today", "week", "ongoing", "all"],
          description: "Filter to a specific section. Defaults to 'all'.",
        },
        includeDetails: {
          type: "boolean",
          description:
            "Include full task file content. Defaults to false.",
        },
      },
    },
  },
  {
    name: "get_memory",
    description:
      "Look up people or companies from your relationship memory. Use this when discussing customers, partners, prospects, or team members to access existing context and history.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the person or company to look up.",
        },
        includeRelated: {
          type: "boolean",
          description:
            "Include related tasks and activity. Uses Claude CLI for deeper analysis. Defaults to false.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "add_quick_note",
    description:
      "Capture insights, discoveries, and decisions to your Ambient Context as you work together. USE THIS FREQUENTLY when discovering useful tools, making architecture decisions, or learning something worth remembering. The content will be processed later into permanent context.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description:
            "The note content. Can include hashtags like #today, #week, #research, #tool, #architecture, etc.",
        },
        title: {
          type: "string",
          description:
            "Optional title for the note. If not provided, appends to today's daily note.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Additional tags to add (as hashtags).",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "update_task",
    description:
      "Update your tasks - mark complete when finished, add progress notes, or adjust details. Use this to keep the task list current as work progresses.",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "Task name (matches wiki-link in Tasks/Main.md).",
        },
        action: {
          type: "string",
          enum: ["complete", "uncomplete", "add_note"],
          description: "Action to perform on the task.",
        },
        content: {
          type: "string",
          description: "Note content (required for add_note action).",
        },
      },
      required: ["task", "action"],
    },
  },
  {
    name: "find_context",
    description:
      "Search your Ambient Context for relevant information by topic, keyword, or tag. Use this to check if something has been researched before, find past decisions, or locate related work. Always search context before diving into new research.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query - can be a topic, name, or keyword.",
        },
        type: {
          type: "string",
          enum: ["task", "memory", "research", "writing", "all"],
          description: "Filter to a specific content type. Defaults to 'all'.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by frontmatter tags.",
        },
        limit: {
          type: "number",
          description: "Maximum results to return. Defaults to 10.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "read_note",
    description:
      "Read the full content of any vault note. Use this after find_context to get complete details of a specific note. Accepts either a path (e.g., 'Research/Tailscale.md') or a name to search for.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Direct path to the note (e.g., 'Memory/Acme Corp.md' or 'Research/Tailscale').",
        },
        name: {
          type: "string",
          description:
            "Note name to search for. Searches across Memory, Tasks, Research, Writing, and Inbox.",
        },
      },
    },
  },
  {
    name: "prepare_meeting",
    description:
      "Prepare the user for an upcoming meeting by gathering all relevant context - relationship history, active tasks, Linear issues, and recent emails. Use this when the user mentions an upcoming meeting to ensure he's fully prepared.",
    inputSchema: {
      type: "object",
      properties: {
        meeting: {
          type: "string",
          description:
            "Meeting title or 'next' to auto-detect the next meeting from calendar.",
        },
        depth: {
          type: "string",
          enum: ["quick", "standard", "deep"],
          description: "Preparation depth. Defaults to 'standard'.",
        },
      },
    },
  },
  {
    name: "update_meeting_note",
    description:
      "Capture meeting outcomes directly to your Ambient Context - key decisions, action items, and insights. Use this during or after meetings to ensure nothing important is lost.",
    inputSchema: {
      type: "object",
      properties: {
        meeting: {
          type: "string",
          description:
            "Meeting title (matches file name like 'Meeting - Topic.md').",
        },
        section: {
          type: "string",
          enum: ["notes", "decisions", "followups", "analysis"],
          description: "Which section to update.",
        },
        content: {
          type: "string",
          description: "Content to add to the section.",
        },
        append: {
          type: "boolean",
          description:
            "Append to existing content (true) or replace (false). Defaults to true.",
        },
      },
      required: ["meeting", "section", "content"],
    },
  },
  {
    name: "run_workflow",
    description:
      "Run a vault workflow like morning startup, end-of-day, or end-of-week processing. These are heavy operations that sync Linear tickets, process inbox items, and organize tasks.",
    inputSchema: {
      type: "object",
      properties: {
        workflow: {
          type: "string",
          enum: ["today", "eob", "eow"],
          description:
            "Which workflow to run: today (morning startup), eob (end of business day), eow (end of week).",
        },
        dry_run: {
          type: "boolean",
          description:
            "Preview changes without executing. Defaults to false.",
        },
      },
      required: ["workflow"],
    },
  },
  {
    name: "save_memory",
    description:
      "Save or update a Memory note about a person, company, or topic. Use this to persist insights discovered during conversations so they become part of your ambient context.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Person, company, or topic name.",
        },
        category: {
          type: "string",
          enum: [
            "customer",
            "prospect",
            "advisor",
            "consultant",
            "supplier",
            "talent",
            "work",
            "other",
          ],
          description:
            "Category for the memory note. Used to organize into subfolders. Defaults to 'other'.",
        },
        content: {
          type: "string",
          description: "Markdown content to save or append.",
        },
        append: {
          type: "boolean",
          description:
            "Append to existing note (true) or replace content (false). Defaults to true.",
        },
      },
      required: ["name", "content"],
    },
  },
];

// Tool handlers map
const toolHandlers: Record<
  string,
  (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[] }>
> = {
  list_toc: listToc,
  list_tasks: listTasks,
  get_memory: getMemory,
  add_quick_note: addQuickNote,
  update_task: updateTask,
  find_context: findContext,
  read_note: readNote,
  prepare_meeting: prepareMeeting,
  update_meeting_note: updateMeetingNote,
  run_workflow: runWorkflow,
  save_memory: saveMemory,
};

/**
 * Get all tool definitions
 */
export function getToolDefinitions(): Tool[] {
  return toolDefinitions;
}

/**
 * Handle a tool call
 */
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[] }> {
  const handler = toolHandlers[name];
  if (!handler) {
    return {
      content: [
        {
          type: "text",
          text: `## Error\n\nUnknown tool: ${name}\n\nAvailable tools: ${Object.keys(toolHandlers).join(", ")}`,
        },
      ],
    };
  }

  try {
    return await handler(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `## Error\n\nFailed to execute ${name}: ${message}`,
        },
      ],
    };
  }
}

/**
 * Register all tools with the server (for type checking)
 */
export function registerAllTools(): void {
  // Tools are registered via getToolDefinitions and handleToolCall
  // This function exists for potential future initialization needs
}
