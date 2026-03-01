/**
 * Vault file operations utility
 * Common functions for reading/writing vault files
 */

import { readFile, writeFile, readdir, stat } from "fs/promises";
import { join, resolve, basename, dirname, sep } from "path";
import matter from "gray-matter";
import { glob } from "glob";

const VAULT_PATH =
  process.env.VAULT_PATH ||
  new URL("../../../..", import.meta.url).pathname.replace(/\/$/, "");

/**
 * Get configured timezone from env var or setup-config.json
 * Falls back to system timezone if not configured
 */
export function getTimezone(): string {
  if (process.env.VAULT_TIMEZONE) return process.env.VAULT_TIMEZONE;
  try {
    const configPath = join(VAULT_PATH, ".claude/state/setup-config.json");
    const config = JSON.parse(require("fs").readFileSync(configPath, "utf-8"));
    if (config.timezone) return config.timezone;
  } catch {
    // Config not found or invalid
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export interface VaultFile {
  path: string;
  relativePath: string;
  name: string;
  content: string;
  frontmatter: Record<string, unknown>;
  body: string;
}

export interface TaskItem {
  name: string;
  completed: boolean;
  wikiLink: string;
}

/**
 * Get the vault root path
 */
export function getVaultPath(): string {
  return VAULT_PATH;
}

/**
 * Resolve a relative path within the vault and verify it doesn't escape.
 * Prevents path traversal attacks (e.g. "../../etc/passwd").
 */
function safeVaultPath(relativePath: string): string {
  const fullPath = resolve(VAULT_PATH, relativePath);
  if (!fullPath.startsWith(VAULT_PATH + sep) && fullPath !== VAULT_PATH) {
    throw new Error("Path traversal detected: path escapes vault boundary");
  }
  return fullPath;
}

/**
 * Read a file from the vault with frontmatter parsing
 */
export async function readVaultFile(relativePath: string): Promise<VaultFile> {
  const fullPath = safeVaultPath(relativePath);
  const content = await readFile(fullPath, "utf-8");
  const { data: frontmatter, content: body } = matter(content);

  return {
    path: fullPath,
    relativePath,
    name: basename(relativePath, ".md"),
    content,
    frontmatter,
    body,
  };
}

/**
 * Write a file to the vault
 */
export async function writeVaultFile(
  relativePath: string,
  content: string
): Promise<void> {
  const fullPath = safeVaultPath(relativePath);
  await writeFile(fullPath, content, "utf-8");
}

/**
 * Append content to a vault file
 */
export async function appendToVaultFile(
  relativePath: string,
  content: string
): Promise<void> {
  const file = await readVaultFile(relativePath);
  await writeVaultFile(relativePath, file.content + "\n" + content);
}

/**
 * Find all markdown files in a directory
 */
export async function findMarkdownFiles(
  directory: string,
  options: { recursive?: boolean; excludeArchive?: boolean } = {}
): Promise<string[]> {
  const { recursive = true, excludeArchive = true } = options;
  const pattern = recursive ? "**/*.md" : "*.md";
  const fullPath = join(VAULT_PATH, directory);

  let files = await glob(pattern, {
    cwd: fullPath,
    absolute: false,
  });

  if (excludeArchive) {
    files = files.filter((f) => !f.includes("_archive"));
  }

  return files.map((f) => join(directory, f));
}

/**
 * Check if a file exists in the vault
 */
export async function fileExists(relativePath: string): Promise<boolean> {
  try {
    const fullPath = join(VAULT_PATH, relativePath);
    await stat(fullPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get today's date in YYYY-MM-DD format (for daily notes)
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date in YYYY-MM-DD format (for frontmatter)
 */
export function getTodayISODate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Parse Tasks/Main.md to extract task items
 */
export async function parseTasksMain(): Promise<{
  dueToday: TaskItem[];
  dueThisWeek: TaskItem[];
  ongoing: TaskItem[];
}> {
  const file = await readVaultFile("Tasks/Main.md");
  const lines = file.body.split("\n");

  const dueToday: TaskItem[] = [];
  const dueThisWeek: TaskItem[] = [];
  const ongoing: TaskItem[] = [];

  let currentSection = "";

  for (const line of lines) {
    if (line.startsWith("## Due Today")) {
      currentSection = "today";
    } else if (line.startsWith("## Due This Week")) {
      currentSection = "week";
    } else if (line.startsWith("## Ongoing")) {
      currentSection = "ongoing";
    } else if (line.match(/^- \[[ x]\] \[\[/)) {
      const completed = line.includes("[x]");
      const match = line.match(/\[\[([^\]]+)\]\]/);
      if (match) {
        const item: TaskItem = {
          name: match[1],
          completed,
          wikiLink: `[[${match[1]}]]`,
        };

        if (currentSection === "today") {
          dueToday.push(item);
        } else if (currentSection === "week") {
          dueThisWeek.push(item);
        } else if (currentSection === "ongoing") {
          ongoing.push(item);
        }
      }
    }
  }

  return { dueToday, dueThisWeek, ongoing };
}

/**
 * Update a task's completion status in Tasks/Main.md
 */
export async function updateTaskStatus(
  taskName: string,
  completed: boolean
): Promise<boolean> {
  const file = await readVaultFile("Tasks/Main.md");
  const lines = file.body.split("\n");
  let updated = false;

  const newLines = lines.map((line) => {
    if (line.includes(`[[${taskName}]]`)) {
      if (completed && line.includes("[ ]")) {
        updated = true;
        return line.replace("[ ]", "[x]");
      } else if (!completed && line.includes("[x]")) {
        updated = true;
        return line.replace("[x]", "[ ]");
      }
    }
    return line;
  });

  if (updated) {
    await writeVaultFile("Tasks/Main.md", newLines.join("\n"));
  }

  return updated;
}

/**
 * Generate a deep link for a vault note.
 * Renders as a clickable markdown link with wiki-link text,
 * pointing to the web UI for direct note access.
 */
export function deepLink(relativePath: string, name: string): string {
  const port = process.env.MCP_SERVER_PORT || "9000";
  const baseUrl = process.env.VAULT_WEB_URL || `http://localhost:${port}`;
  const encodedPath = encodeURIComponent(relativePath);
  return `[[${name}]](${baseUrl}/#/note/${encodedPath})`;
}

/**
 * Find a Memory note by name (case-insensitive search)
 */
export async function findMemoryNote(
  name: string
): Promise<VaultFile | null> {
  const memoryFiles = await findMarkdownFiles("Memory");
  const searchName = name.toLowerCase();

  for (const filePath of memoryFiles) {
    const fileName = basename(filePath, ".md").toLowerCase();
    if (fileName === searchName || fileName.includes(searchName)) {
      return readVaultFile(filePath);
    }
  }

  return null;
}

/**
 * Search vault files for content matching a query.
 * Uses qmd indexed search (BM25 + semantic) when available, with fallback
 * to brute-force scan if qmd is not installed.
 */
export async function searchVault(
  query: string,
  options: {
    directories?: string[];
    tags?: string[];
    limit?: number;
    mode?: "hybrid" | "keyword" | "semantic";
  } = {}
): Promise<VaultFile[]> {
  const {
    directories = ["Memory", "Tasks", "Research", "Writing"],
    tags,
    limit = 10,
    mode = "hybrid",
  } = options;

  // Try qmd first
  if (await getQmdAvailable()) {
    try {
      return await searchVaultWithQmd(query, { directories, tags, limit, mode });
    } catch (e) {
      console.error("qmd search failed, falling back to brute-force:", e);
    }
  }

  // Fallback: brute-force scan
  return searchVaultBruteForce(query, { directories, tags, limit });
}

// Cache qmd availability check (reset on each server restart)
let _qmdAvailable: boolean | null = null;

async function getQmdAvailable(): Promise<boolean> {
  if (_qmdAvailable === null) {
    const { isQmdAvailable } = await import("./qmd.js");
    _qmdAvailable = await isQmdAvailable();
  }
  return _qmdAvailable;
}

/**
 * Search using qmd indexed search
 */
async function searchVaultWithQmd(
  query: string,
  options: {
    directories: string[];
    tags?: string[];
    limit: number;
    mode: "hybrid" | "keyword" | "semantic";
  }
): Promise<VaultFile[]> {
  const { directories, tags, limit, mode } = options;
  const { qmdSearch, qmdQuery, qmdVsearch } = await import("./qmd.js");

  // Request more results than needed so we can filter by directory/tags
  const fetchLimit = limit * 3;

  let results;
  switch (mode) {
    case "keyword":
      results = await qmdSearch(query, { limit: fetchLimit });
      break;
    case "semantic":
      results = await qmdVsearch(query, { limit: fetchLimit });
      break;
    case "hybrid":
    default:
      results = await qmdQuery(query, { limit: fetchLimit });
      break;
  }

  // Map qmd results to VaultFiles, filtering by directory and tags
  const dirLower = directories.map((d) => d.toLowerCase());
  const vaultFiles: VaultFile[] = [];

  for (const result of results) {
    if (vaultFiles.length >= limit) break;

    // qmd returns lowercase paths - find the real file
    const realPath = await resolveQmdPath(result.file);
    if (!realPath) continue;

    // Filter by directory
    const fileDir = realPath.split("/")[0];
    if (!dirLower.includes(fileDir.toLowerCase())) continue;

    try {
      const file = await readVaultFile(realPath);

      // Filter by tags if specified
      if (tags && tags.length > 0) {
        const fileTags = (file.frontmatter.tags as string[]) || [];
        const hasTag = tags.some((t) =>
          fileTags.map((ft) => ft.toLowerCase()).includes(t.toLowerCase())
        );
        if (!hasTag) continue;
      }

      vaultFiles.push(file);
    } catch {
      // Skip files that can't be read
    }
  }

  return vaultFiles;
}

// Cache for resolving qmd lowercase paths to real filesystem paths
const _pathCache = new Map<string, string | null>();

/**
 * Resolve a qmd lowercase path to the real vault path with correct casing.
 * qmd normalizes paths to lowercase, so we need to find the actual file.
 */
async function resolveQmdPath(qmdPath: string): Promise<string | null> {
  if (_pathCache.has(qmdPath)) return _pathCache.get(qmdPath)!;

  // Walk the path segments and find case-insensitive matches
  // (macOS is case-insensitive so we can't rely on fileExists for correct casing)
  const segments = qmdPath.split("/");
  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const parentDir = currentPath || ".";
    const fullParent = join(VAULT_PATH, parentDir);

    try {
      const { readdir: rd } = await import("fs/promises");
      const entries = await rd(fullParent);
      const match = entries.find(
        (e) => e.toLowerCase() === segment.toLowerCase()
      );

      if (!match) {
        _pathCache.set(qmdPath, null);
        return null;
      }

      currentPath = currentPath ? `${currentPath}/${match}` : match;
    } catch {
      _pathCache.set(qmdPath, null);
      return null;
    }
  }

  _pathCache.set(qmdPath, currentPath);
  return currentPath;
}

/**
 * Brute-force vault search (original implementation, used as fallback)
 */
async function searchVaultBruteForce(
  query: string,
  options: {
    directories: string[];
    tags?: string[];
    limit: number;
  }
): Promise<VaultFile[]> {
  const { directories, tags, limit } = options;

  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length >= 2);

  const fullQueryLower = query.toLowerCase();

  interface ScoredFile {
    file: VaultFile;
    score: number;
  }

  const scoredResults: ScoredFile[] = [];

  for (const dir of directories) {
    const files = await findMarkdownFiles(dir);

    for (const filePath of files) {
      try {
        const file = await readVaultFile(filePath);

        if (tags && tags.length > 0) {
          const fileTags = (file.frontmatter.tags as string[]) || [];
          const hasTag = tags.some((t) =>
            fileTags.map((ft) => ft.toLowerCase()).includes(t.toLowerCase())
          );
          if (!hasTag) continue;
        }

        const nameLower = file.name.toLowerCase();
        const bodyLower = file.body.toLowerCase();
        const fileTags = ((file.frontmatter.tags as string[]) || []).map((t) =>
          t.toLowerCase()
        );

        let score = 0;

        if (nameLower.includes(fullQueryLower)) score += 100;
        if (bodyLower.includes(fullQueryLower)) score += 50;

        for (const word of queryWords) {
          if (nameLower.includes(word)) score += 20;
          if (fileTags.some((t) => t.includes(word))) score += 15;
          if (bodyLower.includes(word)) score += 5;
        }

        if (score > 0) {
          scoredResults.push({ file, score });
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }

  scoredResults.sort((a, b) => b.score - a.score);
  return scoredResults.slice(0, limit).map((r) => r.file);
}
