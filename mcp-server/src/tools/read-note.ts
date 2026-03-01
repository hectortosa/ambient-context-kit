/**
 * read_note tool
 * Read the full content of any vault note by path or name
 */

import { readVaultFile, findMarkdownFiles, deepLink } from "../utils/vault.js";
import { basename } from "path";

interface ReadNoteArgs {
  path?: string;
  name?: string;
}

export async function readNote(
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[] }> {
  const { path, name } = args as ReadNoteArgs;

  if (!path && !name) {
    return {
      content: [
        {
          type: "text",
          text: "## Error\n\nMissing required parameter: provide either `path` or `name`",
        },
      ],
    };
  }

  try {
    let filePath: string | null = null;

    if (path) {
      // Direct path provided - normalize it
      filePath = path.endsWith(".md") ? path : `${path}.md`;
    } else if (name) {
      // Search for note by name across all sections
      const searchName = name.toLowerCase().replace(/\.md$/, "");
      const directories = ["Memory", "Tasks", "Research", "Writing", "Inbox"];

      for (const dir of directories) {
        const files = await findMarkdownFiles(dir);
        for (const f of files) {
          const fileName = basename(f, ".md").toLowerCase();
          if (fileName === searchName || fileName.includes(searchName)) {
            filePath = f;
            break;
          }
        }
        if (filePath) break;
      }

      if (!filePath) {
        return {
          content: [
            {
              type: "text",
              text: `## Not Found\n\nNo note found matching "${name}".\n\nTry using \`find_context\` to search for related notes.`,
            },
          ],
        };
      }
    }

    const file = await readVaultFile(filePath!);

    let md = `## ${deepLink(file.relativePath, file.name)}\n\n`;
    md += `**Path**: \`${file.relativePath}\`\n\n`;

    // Show frontmatter if present
    if (Object.keys(file.frontmatter).length > 0) {
      md += "### Metadata\n\n";
      for (const [key, value] of Object.entries(file.frontmatter)) {
        if (Array.isArray(value)) {
          md += `- **${key}**: ${value.map((v) => `\`${v}\``).join(", ")}\n`;
        } else {
          md += `- **${key}**: ${value}\n`;
        }
      }
      md += "\n";
    }

    md += "### Content\n\n";
    md += file.body.trim();

    return {
      content: [{ type: "text", text: md }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `## Error\n\nFailed to read note: ${message}`,
        },
      ],
    };
  }
}
