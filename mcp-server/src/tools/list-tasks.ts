/**
 * list_tasks tool
 * Returns current task list from Tasks/Main.md
 */

import { parseTasksMain, readVaultFile, deepLink } from "../utils/vault.js";

interface ListTasksArgs {
  section?: "today" | "week" | "ongoing" | "all";
  includeDetails?: boolean;
}

export async function listTasks(
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[] }> {
  const { section = "all", includeDetails = false } = args as ListTasksArgs;

  const { dueToday, dueThisWeek, ongoing } = await parseTasksMain();

  let md = "## Current Tasks\n\n";

  const renderSection = (
    title: string,
    items: { name: string; completed: boolean; wikiLink: string }[]
  ) => {
    let result = `### ${title} (${items.length})\n`;
    if (items.length === 0) {
      result += "(none)\n\n";
    } else {
      for (const item of items) {
        const checkbox = item.completed ? "[x]" : "[ ]";
        const status = item.completed ? " (completed)" : "";
        const link = deepLink(`Tasks/${item.name}.md`, item.name);
        result += `- ${checkbox} ${link}${status}\n`;
      }
      result += "\n";
    }
    return result;
  };

  if (section === "all" || section === "today") {
    md += renderSection("Due Today", dueToday);
  }

  if (section === "all" || section === "week") {
    md += renderSection("Due This Week", dueThisWeek);
  }

  if (section === "all" || section === "ongoing") {
    md += renderSection("Ongoing", ongoing);
  }

  // Summary
  if (section === "all") {
    const totalCompleted =
      dueToday.filter((t) => t.completed).length +
      dueThisWeek.filter((t) => t.completed).length +
      ongoing.filter((t) => t.completed).length;

    const totalPending =
      dueToday.filter((t) => !t.completed).length +
      dueThisWeek.filter((t) => !t.completed).length +
      ongoing.filter((t) => !t.completed).length;

    md += `### Summary\n`;
    md += `- **Completed**: ${totalCompleted}\n`;
    md += `- **Pending**: ${totalPending}\n`;
  }

  // Include task details if requested
  if (includeDetails) {
    md += "\n---\n\n## Task Details\n\n";

    const allTasks = [...dueToday, ...dueThisWeek, ...ongoing];
    const tasksToShow =
      section === "today"
        ? dueToday
        : section === "week"
          ? dueThisWeek
          : section === "ongoing"
            ? ongoing
            : allTasks;

    for (const task of tasksToShow) {
      try {
        const file = await readVaultFile(`Tasks/${task.name}.md`);
        md += `### ${deepLink(`Tasks/${task.name}.md`, task.name)}\n\n`;

        // Show frontmatter info
        if (file.frontmatter.dueDate) {
          md += `**Due**: ${file.frontmatter.dueDate}\n`;
        }
        if (file.frontmatter.tags) {
          const tags = file.frontmatter.tags as string[];
          md += `**Tags**: ${tags.map((t) => `#${t}`).join(", ")}\n`;
        }
        md += "\n";

        // Show body (truncated if long)
        const body = file.body.trim();
        if (body.length > 500) {
          md += body.substring(0, 500) + "...\n\n";
        } else {
          md += body + "\n\n";
        }
      } catch {
        // Task file might not exist
        md += `### [[${task.name}]]\n\n(Task file not found)\n\n`;
      }
    }
  }

  return {
    content: [{ type: "text", text: md }],
  };
}
