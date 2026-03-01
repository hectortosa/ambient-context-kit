/**
 * Claude CLI wrapper for invoking the mcp-assistant sub-agent
 * Executes claude -p "<prompt>" in the vault directory
 */

import { spawn } from "child_process";

const VAULT_PATH =
  process.env.VAULT_PATH ||
  new URL("../../..", import.meta.url).pathname.replace(/\/$/, "");
const CLAUDE_CLI = process.env.CLAUDE_CLI_PATH || "claude";

export interface ClaudeInvocationOptions {
  prompt: string;
  timeout?: number; // milliseconds, default 120000 (2 min)
}

export interface ClaudeResult {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Invoke Claude CLI with a prompt
 * Uses the mcp-assistant agent context
 */
export async function invokeClaude(
  options: ClaudeInvocationOptions
): Promise<ClaudeResult> {
  const { prompt, timeout = 120000 } = options;

  return new Promise((resolve) => {
    let output = "";
    let errorOutput = "";
    let timedOut = false;

    const proc = spawn(CLAUDE_CLI, ["-p", prompt, "--output-format", "text"], {
      cwd: VAULT_PATH,
      env: {
        ...process.env,
        // Ensure Claude knows it's being invoked programmatically
        CLAUDE_CODE_ENTRYPOINT: "mcp-server",
      },
    });

    const timeoutId = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
    }, timeout);

    proc.stdout.on("data", (data) => {
      output += data.toString();
    });

    proc.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timeoutId);

      if (timedOut) {
        resolve({
          success: false,
          output: "",
          error: `Claude CLI timed out after ${timeout}ms`,
        });
        return;
      }

      if (code === 0) {
        resolve({
          success: true,
          output: output.trim(),
        });
      } else {
        resolve({
          success: false,
          output: output.trim(),
          error: errorOutput.trim() || `Claude CLI exited with code ${code}`,
        });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        output: "",
        error: `Failed to spawn Claude CLI: ${err.message}`,
      });
    });
  });
}

/**
 * Invoke the mcp-assistant agent with a specific instruction
 * Wraps the prompt with the /mcp-assistant skill prefix
 */
export async function invokeMcpAssistant(
  instruction: string,
  timeout?: number
): Promise<ClaudeResult> {
  const prompt = `/mcp-assistant ${instruction}`;
  return invokeClaude({ prompt, timeout });
}

/**
 * Get the vault path
 */
export function getVaultPath(): string {
  return VAULT_PATH;
}
