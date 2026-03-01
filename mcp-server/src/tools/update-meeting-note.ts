/**
 * update_meeting_note tool
 * Add content to an existing meeting notes file
 */

import {
  readVaultFile,
  writeVaultFile,
  findMarkdownFiles,
  fileExists,
} from "../utils/vault.js";
import { regenerateToc } from "../utils/toc.js";

interface UpdateMeetingNoteArgs {
  meeting: string;
  section: "notes" | "decisions" | "followups" | "analysis";
  content: string;
  append?: boolean;
}

// Section headers in meeting notes
const sectionHeaders: Record<string, string> = {
  notes: "## Meeting Notes",
  decisions: "## Decisions Made",
  followups: "## Follow-up Actions",
  analysis: "## Analysis",
};

export async function updateMeetingNote(
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[] }> {
  const {
    meeting,
    section,
    content,
    append = true,
  } = args as UpdateMeetingNoteArgs;

  if (!meeting) {
    return {
      content: [
        {
          type: "text",
          text: "## Error\n\nMissing required parameter: meeting",
        },
      ],
    };
  }

  if (!section) {
    return {
      content: [
        {
          type: "text",
          text: "## Error\n\nMissing required parameter: section",
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

  const sectionHeader = sectionHeaders[section];
  if (!sectionHeader) {
    return {
      content: [
        {
          type: "text",
          text: `## Error\n\nUnknown section: ${section}. Valid sections: notes, decisions, followups, analysis`,
        },
      ],
    };
  }

  // Find the meeting file
  let filePath: string | null = null;

  // Try exact match first
  const exactPath = `Inbox/Meeting - ${meeting}.md`;
  if (await fileExists(exactPath)) {
    filePath = exactPath;
  }

  // Try partial match
  if (!filePath) {
    const inboxFiles = await findMarkdownFiles("Inbox", { recursive: false });
    const meetingLower = meeting.toLowerCase();

    for (const file of inboxFiles) {
      if (
        file.toLowerCase().includes("meeting") &&
        file.toLowerCase().includes(meetingLower)
      ) {
        filePath = file;
        break;
      }
    }
  }

  // Also check archive
  if (!filePath) {
    const archiveFiles = await findMarkdownFiles("Inbox/_archive", {
      recursive: false,
    });
    const meetingLower = meeting.toLowerCase();

    for (const file of archiveFiles) {
      if (
        file.toLowerCase().includes("meeting") &&
        file.toLowerCase().includes(meetingLower)
      ) {
        filePath = file;
        break;
      }
    }
  }

  if (!filePath) {
    return {
      content: [
        {
          type: "text",
          text: `## Meeting Note Not Found

Could not find meeting notes for "${meeting}".

### Searched Locations
- \`Inbox/Meeting - ${meeting}.md\`
- Files containing "meeting" and "${meeting}" in Inbox/
- Files in Inbox/_archive/

### Suggestion
Run \`prepare_meeting\` first to create the meeting notes file, or check the meeting title spelling.`,
        },
      ],
    };
  }

  // Read the file
  const file = await readVaultFile(filePath);
  const lines = file.content.split("\n");

  // Find the section
  const sectionIdx = lines.findIndex((l) =>
    l.trim().startsWith(sectionHeader)
  );

  if (sectionIdx === -1) {
    // Section doesn't exist, add it at the end (before any trailing ---)
    const lastDashIdx = lines.findLastIndex((l) => l.trim() === "---");
    const insertIdx = lastDashIdx > 0 ? lastDashIdx : lines.length;

    const newSection = `\n${sectionHeader}\n\n${content}\n`;
    lines.splice(insertIdx, 0, newSection);
  } else {
    // Find the end of this section (next ## or ---)
    let endIdx = lines.findIndex(
      (l, i) =>
        i > sectionIdx && (l.startsWith("## ") || l.trim() === "---")
    );
    if (endIdx === -1) endIdx = lines.length;

    if (append) {
      // Find where to append (after existing content, before next section)
      // Skip empty lines at the end of the section
      let insertIdx = endIdx;
      while (insertIdx > sectionIdx && lines[insertIdx - 1].trim() === "") {
        insertIdx--;
      }

      // Add the new content
      const { getTimezone } = await import("../utils/vault.js");
      const timestamp = new Date().toLocaleString("en-US", {
        timeZone: getTimezone(),
      });

      let newContent: string;
      if (section === "followups") {
        // Format as task items
        const items = content
          .split("\n")
          .filter((l) => l.trim())
          .map((l) => {
            const trimmed = l.trim();
            if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- [x]")) {
              return trimmed;
            }
            return `- [ ] ${trimmed}`;
          });
        newContent = items.join("\n");
      } else if (section === "decisions") {
        // Format as numbered list
        const items = content
          .split("\n")
          .filter((l) => l.trim())
          .map((l, i) => {
            const trimmed = l.trim();
            if (/^\d+\./.test(trimmed)) {
              return trimmed;
            }
            return `${i + 1}. ${trimmed}`;
          });
        newContent = items.join("\n");
      } else {
        // Notes and analysis: just add as-is with timestamp
        newContent = `\n*Added ${timestamp}:*\n${content}`;
      }

      lines.splice(insertIdx, 0, newContent);
    } else {
      // Replace section content
      // Remove existing content (keep header)
      const contentStart = sectionIdx + 1;
      const removeCount = endIdx - contentStart;

      let newContent: string;
      if (section === "followups") {
        const items = content
          .split("\n")
          .filter((l) => l.trim())
          .map((l) => {
            const trimmed = l.trim();
            if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- [x]")) {
              return trimmed;
            }
            return `- [ ] ${trimmed}`;
          });
        newContent = "\n" + items.join("\n") + "\n";
      } else if (section === "decisions") {
        const items = content
          .split("\n")
          .filter((l) => l.trim())
          .map((l, i) => {
            const trimmed = l.trim();
            if (/^\d+\./.test(trimmed)) {
              return trimmed;
            }
            return `${i + 1}. ${trimmed}`;
          });
        newContent = "\n" + items.join("\n") + "\n";
      } else {
        newContent = "\n" + content + "\n";
      }

      lines.splice(contentStart, removeCount, newContent);
    }
  }

  // Write the updated file
  await writeVaultFile(filePath, lines.join("\n"));

  // Regenerate TOC
  await regenerateToc();

  const md = `## Meeting Note Updated

**File**: \`${filePath}\`
**Section**: ${sectionHeader}
**Mode**: ${append ? "Appended" : "Replaced"}

### Added Content

\`\`\`
${content}
\`\`\`

### Current Section State

The ${section} section has been updated. Open the file in Obsidian to see the full content.
`;

  return {
    content: [{ type: "text", text: md }],
  };
}
