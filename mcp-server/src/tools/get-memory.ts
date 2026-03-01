/**
 * get_memory tool
 * Look up a person or company from the Memory folder
 */

import { findMemoryNote, searchVault, deepLink } from "../utils/vault.js";
import { invokeMcpAssistant } from "../claude-cli.js";

interface GetMemoryArgs {
  name: string;
  includeRelated?: boolean;
}

export async function getMemory(
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[] }> {
  const { name, includeRelated = false } = args as GetMemoryArgs;

  if (!name) {
    return {
      content: [
        {
          type: "text",
          text: "## Error\n\nMissing required parameter: name",
        },
      ],
    };
  }

  // Simple lookup - direct file read
  const memoryNote = await findMemoryNote(name);

  if (!memoryNote) {
    return {
      content: [
        {
          type: "text",
          text: `## Memory Note Not Found\n\nNo Memory note found for "${name}".\n\n### Suggestion\nCreate a new Memory note at \`Memory/${name}.md\` with relevant context.`,
        },
      ],
    };
  }

  let md = `## ${deepLink(memoryNote.relativePath, memoryNote.name)}\n\n`;

  // Show tags
  if (memoryNote.frontmatter.tags) {
    const tags = memoryNote.frontmatter.tags as string[];
    md += `**Tags**: ${tags.map((t) => `\`${t}\``).join(", ")}\n\n`;
  }

  // Show other frontmatter
  const skipKeys = ["tags"];
  const otherMeta = Object.entries(memoryNote.frontmatter).filter(
    ([key]) => !skipKeys.includes(key)
  );
  if (otherMeta.length > 0) {
    for (const [key, value] of otherMeta) {
      md += `**${key}**: ${value}\n`;
    }
    md += "\n";
  }

  // Show body content
  md += memoryNote.body.trim() + "\n";

  // If includeRelated, use Claude CLI for deeper analysis
  if (includeRelated) {
    md += "\n---\n\n## Related Context\n\n";

    // First, do a quick vault search for related items
    const relatedTasks = await searchVault(name, {
      directories: ["Tasks"],
      limit: 5,
    });

    if (relatedTasks.length > 0) {
      md += "### Related Tasks\n";
      for (const task of relatedTasks) {
        const status = task.frontmatter.dueDate
          ? ` (Due: ${task.frontmatter.dueDate})`
          : "";
        md += `- ${deepLink(task.relativePath, task.name)}${status}\n`;
      }
      md += "\n";
    }

    // Use Claude CLI for comprehensive context
    const result = await invokeMcpAssistant(
      `Get full context for "${name}". Include:
1. Any recent Linear issues related to them
2. Recent email activity (last 7 days)
3. Upcoming meetings

Return as structured markdown with sources. Be concise.`,
      60000
    );

    if (result.success) {
      md += "### Extended Context (via Claude)\n\n";
      md += result.output;
    } else {
      md += `### Extended Context\n\n(Could not fetch: ${result.error})\n`;
    }
  }

  md += `\n\n---\n\n**Source**: ${deepLink(memoryNote.relativePath, memoryNote.relativePath)}`;

  return {
    content: [{ type: "text", text: md }],
  };
}
