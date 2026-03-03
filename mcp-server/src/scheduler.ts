/**
 * Workflow Scheduler
 * Runs vault workflows on a schedule (setInterval-based, no external deps)
 */

import { invokeClaude } from "./claude-cli.js";
import { writeVaultFile, fileExists, getTimezone } from "./utils/vault.js";

interface ScheduleEntry {
  workflow: string;
  command: string;
  hour: number;
  minute: number;
  days: number[]; // 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
  enabled: boolean;
}

interface SchedulerState {
  enabled: boolean;
  schedules: ScheduleEntry[];
  lastRun: Record<string, string>; // workflow -> ISO date string of last run
  running: string | null; // currently running workflow
}

const DEFAULT_SCHEDULES: ScheduleEntry[] = [
  {
    workflow: "today",
    command: "/today",
    hour: 8,
    minute: 0,
    days: [1, 2, 3, 4, 5],
    enabled: true,
  },
  {
    workflow: "eob",
    command: "/end-of-business-day",
    hour: 18,
    minute: 0,
    days: [1, 2, 3, 4, 5],
    enabled: true,
  },
  {
    workflow: "eow",
    command: "/end-of-week",
    hour: 17,
    minute: 0,
    days: [5],
    enabled: true,
  },
];

const state: SchedulerState = {
  enabled: process.env.SCHEDULER_ENABLED === "true",
  schedules: [...DEFAULT_SCHEDULES],
  lastRun: {},
  running: null,
};

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Get current time in configured timezone
 */
function getLocalTime(): {
  hour: number;
  minute: number;
  dayOfWeek: number;
  dateKey: string;
} {
  const now = new Date();
  const helsinkiStr = now.toLocaleString("en-US", {
    timeZone: getTimezone(),
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });

  // Parse the formatted string
  const parts = helsinkiStr.split(", ");
  const weekdayStr = parts[0]; // e.g. "Mon"
  const datePart = parts[1]; // e.g. "02/14/2026"
  const timePart = parts[2]; // e.g. "08:00"

  const [hourStr, minuteStr] = timePart.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = dayMap[weekdayStr] ?? 0;

  // ISO date for filenames (YYYY-MM-DD)
  const isoDate = new Date().toLocaleDateString("sv-SE", {
    timeZone: getTimezone(),
  });

  return { hour, minute, dayOfWeek, dateKey: datePart, isoDate };
}

/**
 * Check if a workflow should run now
 */
function shouldRun(entry: ScheduleEntry): boolean {
  if (!entry.enabled) return false;

  const { hour, minute, dayOfWeek, dateKey } = getLocalTime();

  // Check day of week
  if (!entry.days.includes(dayOfWeek)) return false;

  // Check time (within 1-minute window)
  if (hour !== entry.hour || minute !== entry.minute) return false;

  // Check if already ran today for this workflow
  const lastRunKey = `${entry.workflow}-${dateKey}-${entry.hour}:${entry.minute}`;
  if (state.lastRun[lastRunKey]) return false;

  return true;
}

/**
 * Workflow labels for note titles
 */
const WORKFLOW_LABELS: Record<string, string> = {
  today: "Morning Startup",
  eob: "End of Day",
  eow: "End of Week",
};

/**
 * Execute a scheduled workflow in dry-run/informative mode.
 * The output is saved as an Inbox note for review - no vault changes are made.
 */
async function executeScheduled(entry: ScheduleEntry): Promise<void> {
  if (state.running) {
    console.error(
      `[scheduler] Skipping ${entry.workflow} - another workflow is running: ${state.running}`,
    );
    return;
  }

  const { dateKey, isoDate } = getLocalTime();
  const lastRunKey = `${entry.workflow}-${dateKey}-${entry.hour}:${entry.minute}`;

  state.running = entry.workflow;
  state.lastRun[lastRunKey] = new Date().toISOString();

  console.error(
    `[scheduler] Starting scheduled workflow (dry run): ${entry.workflow}`,
  );

  try {
    const dryRunInstruction = `\n\nIMPORTANT: This is an AUTOMATED SCHEDULED RUN. You MUST operate in DRY RUN / PREVIEW mode only. Analyze and present what changes would be made, but DO NOT execute any changes. Do not create, modify, move, or delete any files. Do not mark anything as processed. Present your analysis as a report that the user can review and act on later.`;

    const result = await invokeClaude({
      prompt: entry.command + dryRunInstruction,
      timeout: 1500000,
    });

    const label = WORKFLOW_LABELS[entry.workflow] || entry.workflow;
    const noteTitle = `${isoDate} - ${label}`;
    const notePath = `Inbox/${noteTitle}.md`;

    let noteContent = `---\ntags:\n  - scheduled\n  - ${entry.workflow}\n---\n\n`;
    noteContent += `# ${label} (Scheduled)\n\n`;

    if (result.success) {
      noteContent += result.output;
      console.error(
        `[scheduler] Workflow ${entry.workflow} completed, saving to ${notePath}`,
      );
    } else {
      noteContent += `## Workflow Failed\n\n**Error**: ${result.error}\n`;
      if (result.output) {
        noteContent += `\n**Partial output**:\n\n${result.output}\n`;
      }
      console.error(
        `[scheduler] Workflow ${entry.workflow} failed: ${result.error}`,
      );
    }

    await writeVaultFile(notePath, noteContent);
    console.error(`[scheduler] Report saved to ${notePath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[scheduler] Workflow ${entry.workflow} error: ${message}`);
  } finally {
    state.running = null;
  }
}

/**
 * Scheduler tick - called every 60 seconds
 */
function tick(): void {
  if (!state.enabled) return;

  for (const entry of state.schedules) {
    if (shouldRun(entry)) {
      // Run async, don't await
      executeScheduled(entry).catch((err) =>
        console.error(`[scheduler] Unexpected error:`, err),
      );
    }
  }
}

/**
 * Start the scheduler
 */
export function startScheduler(): void {
  if (!state.enabled) {
    console.error(
      "[scheduler] Disabled (set SCHEDULER_ENABLED=true to enable)",
    );
    return;
  }

  console.error("[scheduler] Starting scheduler...");
  console.error(`[scheduler] Schedules (${getTimezone()}):`);
  for (const entry of state.schedules) {
    const days = entry.days
      .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
      .join(",");
    const status = entry.enabled ? "ON" : "OFF";
    console.error(
      `  ${entry.workflow}: ${String(entry.hour).padStart(2, "0")}:${String(entry.minute).padStart(2, "0")} [${days}] (${status})`,
    );
  }

  // Check every 60 seconds
  intervalId = setInterval(tick, 60000);

  // Run first tick immediately
  tick();
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Get scheduler status (for API)
 */
export function getSchedulerStatus(): {
  enabled: boolean;
  running: string | null;
  schedules: Array<{
    workflow: string;
    time: string;
    days: string;
    enabled: boolean;
  }>;
  lastRuns: Record<string, string>;
} {
  return {
    enabled: state.enabled,
    running: state.running,
    schedules: state.schedules.map((s) => ({
      workflow: s.workflow,
      time: `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`,
      days: s.days
        .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
        .join(", "),
      enabled: s.enabled,
    })),
    lastRuns: { ...state.lastRun },
  };
}

/**
 * Enable/disable the scheduler
 */
export function setSchedulerEnabled(enabled: boolean): void {
  state.enabled = enabled;
  if (enabled && !intervalId) {
    intervalId = setInterval(tick, 60000);
    tick();
  } else if (!enabled && intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  console.error(`[scheduler] ${enabled ? "Enabled" : "Disabled"}`);
}

/**
 * Enable/disable a specific workflow schedule
 */
export function setWorkflowEnabled(
  workflow: string,
  enabled: boolean,
): boolean {
  const entry = state.schedules.find((s) => s.workflow === workflow);
  if (!entry) return false;
  entry.enabled = enabled;
  console.error(
    `[scheduler] Workflow ${workflow}: ${enabled ? "enabled" : "disabled"}`,
  );
  return true;
}

/**
 * Manually trigger a workflow (for API)
 */
export async function triggerWorkflow(
  workflow: string,
): Promise<{ success: boolean; error?: string }> {
  const entry = state.schedules.find((s) => s.workflow === workflow);
  if (!entry) {
    return { success: false, error: `Unknown workflow: ${workflow}` };
  }

  if (state.running) {
    return {
      success: false,
      error: `Another workflow is running: ${state.running}`,
    };
  }

  // Run in background
  executeScheduled(entry).catch((err) =>
    console.error(`[scheduler] Manual trigger error:`, err),
  );

  return { success: true };
}
