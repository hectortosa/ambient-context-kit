/**
 * add_quick_note tool
 * Add a quick note to the Inbox for later processing
 */

import {
  getVaultPath,
  getTodayDateString,
  readVaultFile,
  writeVaultFile,
  fileExists,
} from "../utils/vault.js";
import { regenerateToc } from "../utils/toc.js";

interface AddQuickNoteArgs {
  content: string;
  title?: string;
  tags?: string[];
}

export async function addQuickNote(
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[] }> {
  const { content, title, tags = [] } = args as AddQuickNoteArgs;

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

  // Format content with tags
  let noteContent = content;
  if (tags.length > 0) {
    const tagString = tags.map((t) => `#${t.replace(/^#/, "")}`).join(" ");
    noteContent = `${content} ${tagString}`;
  }

  let filePath: string;
  let action: string;

  if (title) {
    // Create a new file with the given title
    filePath = `Inbox/${title}.md`;
    const fullContent = `---
tags: []
---

${noteContent}
`;
    await writeVaultFile(filePath, fullContent);
    action = "Created new note";
  } else {
    // Append to today's daily note
    const todayDate = getTodayDateString();
    filePath = `Inbox/${todayDate}.md`;

    const exists = await fileExists(filePath);

    if (exists) {
      // Append to existing daily note
      const file = await readVaultFile(filePath);
      const newContent = file.content + `\n- [ ] ${noteContent}`;
      await writeVaultFile(filePath, newContent);
      action = "Appended to daily note";
    } else {
      // Create new daily note
      const newContent = `## Quick capture

- [ ] ${noteContent}

## Resources

`;
      await writeVaultFile(filePath, newContent);
      action = "Created daily note";
    }
  }

  // Regenerate TOC after write
  await regenerateToc();

  const md = `## Quick Note Added

**${action}**: \`${filePath}\`

### Content
\`\`\`
- [ ] ${noteContent}
\`\`\`

### Next Steps
This note will be processed during the next \`/eob\` (end of business) run:
- Hashtags will be converted to frontmatter
- Content will be categorized and moved to appropriate sections
- Tasks will be added to Tasks/Main.md
`;

  return {
    content: [{ type: "text", text: md }],
  };
}
