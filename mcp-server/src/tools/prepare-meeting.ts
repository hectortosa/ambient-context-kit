/**
 * prepare_meeting tool
 * Run the meeting preparation workflow using Claude CLI
 */

import { invokeMcpAssistant } from "../claude-cli.js";
import { readVaultFile, findMarkdownFiles } from "../utils/vault.js";
import { regenerateToc } from "../utils/toc.js";

interface PrepareMeetingArgs {
  meeting?: string;
  depth?: "quick" | "standard" | "deep";
}

export async function prepareMeeting(
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[] }> {
  const { meeting = "next", depth = "standard" } = args as PrepareMeetingArgs;

  // Build the prompt for the mcp-assistant
  let prompt: string;

  if (meeting === "next") {
    prompt = `Run /meeting-prep for the next upcoming meeting.

IMPORTANT Instructions:
1. First get current time using Bash: date '+%Y-%m-%d %H:%M:%S %Z'
2. Query calendar to find the next meeting
3. Run full meeting prep workflow at ${depth} depth
4. Create the meeting notes file in Inbox/
5. Return the FULL content of the created meeting notes file

After creating the file, read it back and include the entire content in your response.
Format your response as markdown.`;
  } else {
    prompt = `Run /meeting-prep for meeting: "${meeting}"

IMPORTANT Instructions:
1. Search calendar for this meeting
2. Run full meeting prep workflow at ${depth} depth
3. Create the meeting notes file in Inbox/
4. Return the FULL content of the created meeting notes file

After creating the file, read it back and include the entire content in your response.
Format your response as markdown.`;
  }

  // Invoke Claude CLI with longer timeout for meeting prep (can take a while)
  const timeoutMs = depth === "deep" ? 180000 : depth === "quick" ? 60000 : 120000;

  const result = await invokeMcpAssistant(prompt, timeoutMs);

  // Regenerate TOC after potential file creation
  await regenerateToc();

  if (!result.success) {
    return {
      content: [
        {
          type: "text",
          text: `## Meeting Prep Failed

**Error**: ${result.error}

### Troubleshooting
1. Ensure Claude CLI is available and authenticated
2. Check that calendar access (MS365) is configured
3. Try a simpler query like specifying the meeting by name

### Manual Alternative
You can run meeting prep manually:
\`\`\`bash
claude -p "/meeting-prep ${meeting}"
\`\`\``,
        },
      ],
    };
  }

  // Try to find the created meeting notes file
  let meetingNoteContent = "";
  try {
    const inboxFiles = await findMarkdownFiles("Inbox", { recursive: false });
    const meetingFiles = inboxFiles.filter((f) =>
      f.toLowerCase().includes("meeting")
    );

    // Find the most recently modified meeting file
    if (meetingFiles.length > 0) {
      // Sort by checking which ones were likely just created
      for (const file of meetingFiles.slice(-3)) {
        try {
          const content = await readVaultFile(file);
          // Check if this looks like a meeting prep file
          if (
            content.body.includes("## Attendees") ||
            content.body.includes("## Context")
          ) {
            meetingNoteContent = `\n\n---\n\n## Generated Meeting Notes File\n\n**File**: \`${file}\`\n\n${content.content}`;
            break;
          }
        } catch {
          // Skip files we can't read
        }
      }
    }
  } catch {
    // Ignore errors in file discovery
  }

  let md = `## Meeting Preparation Complete

**Meeting**: ${meeting === "next" ? "Next upcoming meeting" : meeting}
**Depth**: ${depth}

---

${result.output}${meetingNoteContent}

---

### Next Steps

1. Review the meeting notes in your Obsidian vault
2. Use \`update_meeting_note\` to add live notes during the meeting
3. The file will be processed during \`/eob\` to extract action items
`;

  return {
    content: [{ type: "text", text: md }],
  };
}
