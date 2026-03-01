/**
 * find_context tool
 * Search the vault for relevant content using Claude CLI for intelligent matching
 */

import { searchVault, VaultFile, deepLink } from "../utils/vault.js";
import { invokeMcpAssistant } from "../claude-cli.js";

interface FindContextArgs {
  query: string;
  type?: "task" | "memory" | "research" | "writing" | "all";
  tags?: string[];
  limit?: number;
}

export async function findContext(
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[] }> {
  const {
    query,
    type = "all",
    tags,
    limit = 10,
  } = args as FindContextArgs;

  if (!query) {
    return {
      content: [
        {
          type: "text",
          text: "## Error\n\nMissing required parameter: query",
        },
      ],
    };
  }

  // Map type to directories
  const typeToDir: Record<string, string[]> = {
    task: ["Tasks"],
    memory: ["Memory"],
    research: ["Research"],
    writing: ["Writing"],
    all: ["Memory", "Tasks", "Research", "Writing"],
  };

  const directories = typeToDir[type] || typeToDir.all;

  // First, do a quick local search
  const localResults = await searchVault(query, {
    directories,
    tags,
    limit,
  });

  let md = `## Search Results for "${query}"\n\n`;

  if (type !== "all") {
    md += `**Filtered to**: ${type}\n`;
  }
  if (tags && tags.length > 0) {
    md += `**Tags filter**: ${tags.map((t) => `\`${t}\``).join(", ")}\n`;
  }
  md += "\n";

  if (localResults.length === 0) {
    md += "### No Direct Matches\n\n";
    md += "No files found matching your query directly.\n\n";

    // Use Claude CLI for a more intelligent search
    md += "### Intelligent Search (via Claude)\n\n";

    const result = await invokeMcpAssistant(
      `Find all relevant context for: "${query}"
Search across: ${directories.join(", ")}
${tags ? `Filter by tags: ${tags.join(", ")}` : ""}

Look for:
1. Direct mentions of the query
2. Related concepts or people
3. Tasks or projects that might be related

Return results as structured markdown with wiki-links.`,
      180000 // 3 minutes - remote MCP calls via tunnel need more time
    );

    if (result.success) {
      md += result.output;
    } else {
      md += `(Search failed: ${result.error})\n`;
    }
  } else {
    md += `### Found ${localResults.length} Matches\n\n`;

    // Group results by directory
    const byDir: Record<string, VaultFile[]> = {};
    for (const file of localResults) {
      const dir = file.relativePath.split("/")[0];
      if (!byDir[dir]) byDir[dir] = [];
      byDir[dir].push(file);
    }

    for (const [dir, files] of Object.entries(byDir)) {
      md += `#### ${dir} (${files.length})\n\n`;

      for (const file of files) {
        md += `**${deepLink(file.relativePath, file.name)}**\n`;

        // Show tags
        if (file.frontmatter.tags) {
          const fileTags = file.frontmatter.tags as string[];
          md += `- Tags: ${fileTags.map((t) => `\`${t}\``).join(", ")}\n`;
        }

        // Show due date for tasks
        if (file.frontmatter.dueDate) {
          md += `- Due: ${file.frontmatter.dueDate}\n`;
        }

        // Show preview of content
        const preview = file.body.trim().substring(0, 200);
        if (preview) {
          md += `- Preview: ${preview}${file.body.length > 200 ? "..." : ""}\n`;
        }

        md += "\n";
      }
    }
  }

  return {
    content: [{ type: "text", text: md }],
  };
}
