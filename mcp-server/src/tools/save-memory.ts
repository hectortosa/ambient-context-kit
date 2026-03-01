/**
 * save_memory tool
 * Create or update Memory notes directly via MCP
 */

import {
  findMemoryNote,
  readVaultFile,
  writeVaultFile,
  appendToVaultFile,
  fileExists,
  getVaultPath,
} from "../utils/vault.js";
import { regenerateToc } from "../utils/toc.js";
import { deepLink } from "../utils/vault.js";
import { mkdir } from "fs/promises";
import { join, dirname } from "path";

interface SaveMemoryArgs {
  name: string;
  category?: string;
  content: string;
  append?: boolean;
}

const VALID_CATEGORIES = [
  "customer",
  "prospect",
  "advisor",
  "consultant",
  "supplier",
  "talent",
  "work",
  "other",
];

export async function saveMemory(
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[] }> {
  const { name, category, content, append = true } = args as SaveMemoryArgs;

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

  if (!content) {
    return {
      content: [
        {
          type: "text",
          text: "## Error\n\nMissing required parameter: content",
        },
      ],
    };
  }

  // Reject path traversal characters in name
  if (
    name.includes("/") ||
    name.includes("\\") ||
    name.includes("..") ||
    name.includes("\0")
  ) {
    return {
      content: [
        {
          type: "text",
          text: "## Error\n\nInvalid name: must not contain path separators, '..' sequences, or null bytes.",
        },
      ],
    };
  }

  if (category && !VALID_CATEGORIES.includes(category)) {
    return {
      content: [
        {
          type: "text",
          text: `## Error\n\nInvalid category: "${category}". Must be one of: ${VALID_CATEGORIES.join(", ")}`,
        },
      ],
    };
  }

  try {
    // Check if note already exists
    const existingNote = await findMemoryNote(name);

    if (existingNote) {
      // Update existing note
      if (append) {
        const { getTimezone } = await import("../utils/vault.js");
        const timestamp = new Date().toLocaleString("en-US", {
          timeZone: getTimezone(),
        });
        const appendContent = `\n\n---\n\n*Updated ${timestamp}*\n\n${content}`;
        await appendToVaultFile(existingNote.relativePath, appendContent);
      } else {
        // Replace body but keep frontmatter
        const frontmatterBlock = existingNote.content.substring(
          0,
          existingNote.content.indexOf(existingNote.body)
        );
        await writeVaultFile(
          existingNote.relativePath,
          frontmatterBlock + content + "\n"
        );
      }

      await regenerateToc();

      const link = deepLink(existingNote.relativePath, existingNote.name);
      let md = `## Memory Updated\n\n`;
      md += `**Note**: ${link}\n`;
      md += `**Action**: ${append ? "Appended" : "Replaced"} content\n\n`;
      md += `### Content ${append ? "Added" : "Set"}\n\n${content}\n`;

      return {
        content: [{ type: "text", text: md }],
      };
    }

    // Create new note
    const resolvedCategory = category || "other";
    const subfolder =
      resolvedCategory.charAt(0).toUpperCase() + resolvedCategory.slice(1);

    // Determine path - use subfolder if category maps to an existing one, otherwise use Memory root
    let relativePath: string;
    const subfolderPath = `Memory/${subfolder}`;
    if (await fileExists(subfolderPath)) {
      relativePath = `${subfolderPath}/${name}.md`;
    } else if (resolvedCategory !== "other") {
      // Create the subfolder
      await mkdir(join(getVaultPath(), subfolderPath), { recursive: true });
      relativePath = `${subfolderPath}/${name}.md`;
    } else {
      relativePath = `Memory/${name}.md`;
    }

    // Build frontmatter
    const tags = [resolvedCategory];
    const frontmatter = `---\ntags:\n${tags.map((t) => `  - ${t}`).join("\n")}\n---\n\n`;
    const fileContent = `${frontmatter}# ${name}\n\n${content}\n`;

    await writeVaultFile(relativePath, fileContent);
    await regenerateToc();

    const link = deepLink(relativePath, name);
    let md = `## Memory Created\n\n`;
    md += `**Note**: ${link}\n`;
    md += `**Category**: ${resolvedCategory}\n`;
    md += `**Path**: \`${relativePath}\`\n\n`;
    md += `### Content\n\n${content}\n`;

    return {
      content: [{ type: "text", text: md }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `## Error\n\nFailed to save memory note: ${message}`,
        },
      ],
    };
  }
}
