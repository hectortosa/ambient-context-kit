/**
 * list_toc tool
 * Returns the vault Table of Contents
 */

import { readToc } from "../utils/toc.js";

interface ListTocArgs {
  section?: "tasks" | "memory" | "research" | "writing" | "all";
}

export async function listToc(
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[] }> {
  const { section = "all" } = args as ListTocArgs;

  const toc = await readToc();

  if (section === "all") {
    return {
      content: [{ type: "text", text: toc }],
    };
  }

  // Extract specific section
  const sectionMap: Record<string, string> = {
    tasks: "## Tasks",
    memory: "## Memory",
    research: "## Research",
    writing: "## Writing",
  };

  const sectionHeader = sectionMap[section];
  if (!sectionHeader) {
    return {
      content: [{ type: "text", text: toc }],
    };
  }

  // Find the section in the TOC
  const lines = toc.split("\n");
  const startIdx = lines.findIndex((l) => l.startsWith(sectionHeader));
  if (startIdx === -1) {
    return {
      content: [
        {
          type: "text",
          text: `## ${section.charAt(0).toUpperCase() + section.slice(1)}\n\n(Section not found in TOC)`,
        },
      ],
    };
  }

  // Find the end of the section (next ## or end of file)
  let endIdx = lines.findIndex(
    (l, i) => i > startIdx && l.startsWith("## ")
  );
  if (endIdx === -1) {
    endIdx = lines.findIndex((l, i) => i > startIdx && l.startsWith("---"));
    if (endIdx === -1) endIdx = lines.length;
  }

  const sectionContent = lines.slice(startIdx, endIdx).join("\n");

  return {
    content: [{ type: "text", text: sectionContent }],
  };
}
