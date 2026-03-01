/**
 * qmd CLI wrapper for indexed BM25 + semantic vector search
 * Falls back gracefully if qmd is not installed or vault collection missing.
 */

import { spawn } from "child_process";

export interface QmdResult {
  docid: string;
  score: number;
  file: string; // relative vault path (e.g. "Memory/Customers/Acme Corp.md")
  title: string;
  snippet: string;
}

export type SearchMode = "hybrid" | "keyword" | "semantic";

const QMD_BIN = process.env.QMD_BIN || "qmd";
const QMD_COLLECTION = process.env.QMD_COLLECTION || "vault";

// Serialize qmd calls to prevent Metal GPU conflicts from concurrent processes
let _qmdLock: Promise<void> = Promise.resolve();

/**
 * Run a qmd CLI command and return parsed JSON output.
 * Serialized to prevent concurrent Metal GPU access crashes.
 */
async function runQmd(args: string[]): Promise<QmdResult[]> {
  const prev = _qmdLock;
  let releaseLock: () => void;
  _qmdLock = new Promise((r) => { releaseLock = r; });
  await prev;
  return new Promise((resolve, reject) => {
    const proc = spawn(QMD_BIN, args, {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30000,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      releaseLock!();
      if (code !== 0) {
        reject(new Error(`qmd exited with code ${code}: ${stderr}`));
        return;
      }
      try {
        const raw = JSON.parse(stdout) as Array<{
          docid: string;
          score: number;
          file: string;
          title: string;
          snippet: string;
        }>;
        const results: QmdResult[] = raw.map((r) => ({
          ...r,
          file: stripQmdPrefix(r.file),
        }));
        resolve(results);
      } catch (e) {
        reject(new Error(`Failed to parse qmd output: ${e}`));
      }
    });

    proc.on("error", (err) => {
      releaseLock!();
      reject(err);
    });
  });
}

/**
 * Strip qmd:// collection prefix to get a relative vault path.
 * "qmd://vault/memory/people/jane-doe.md" -> "memory/people/jane-doe.md"
 */
function stripQmdPrefix(qmdPath: string): string {
  const prefix = `qmd://${QMD_COLLECTION}/`;
  if (qmdPath.startsWith(prefix)) {
    return qmdPath.slice(prefix.length);
  }
  return qmdPath;
}

/**
 * BM25 keyword search
 */
export async function qmdSearch(
  query: string,
  opts: { limit?: number; minScore?: number } = {}
): Promise<QmdResult[]> {
  const args = ["search", query, "-c", QMD_COLLECTION, "--json"];
  if (opts.limit) args.push("-n", String(opts.limit));
  if (opts.minScore) args.push("--min-score", String(opts.minScore));
  return runQmd(args);
}

/**
 * Hybrid search with query expansion + reranking (recommended)
 */
export async function qmdQuery(
  query: string,
  opts: { limit?: number; minScore?: number } = {}
): Promise<QmdResult[]> {
  const args = ["query", query, "-c", QMD_COLLECTION, "--json"];
  if (opts.limit) args.push("-n", String(opts.limit));
  if (opts.minScore) args.push("--min-score", String(opts.minScore));
  return runQmd(args);
}

/**
 * Vector similarity search
 */
export async function qmdVsearch(
  query: string,
  opts: { limit?: number; minScore?: number } = {}
): Promise<QmdResult[]> {
  const args = ["vsearch", query, "-c", QMD_COLLECTION, "--json"];
  if (opts.limit) args.push("-n", String(opts.limit));
  if (opts.minScore) args.push("--min-score", String(opts.minScore));
  return runQmd(args);
}

/**
 * Re-index the vault collection (non-blocking when called with await)
 */
export async function qmdUpdate(): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(QMD_BIN, ["update"], {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60000,
    });

    let stderr = "";
    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`qmd update failed (code ${code}): ${stderr}`));
      } else {
        resolve();
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Check if qmd is installed and the vault collection exists
 */
export async function isQmdAvailable(): Promise<boolean> {
  try {
    return await new Promise((resolve) => {
      const proc = spawn(QMD_BIN, ["collection", "list"], {
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 5000,
      });

      let stdout = "";
      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          resolve(false);
          return;
        }
        resolve(stdout.toLowerCase().includes(QMD_COLLECTION));
      });

      proc.on("error", () => {
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}
