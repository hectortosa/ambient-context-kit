---
name: end-of-week
description: Weekly cleanup workflow to archive completed tasks, clean Tasks/Main.md, and prepare next week's task list
context: fork
agent: assistant
---

# End of Week (`/eow`) Workflow

Complete your week by archiving finished tasks, cleaning up your task list, and preparing for the upcoming week.

## Overview

The `/eow` workflow is your weekly cleanup routine:

1. **Scan Completed Tasks** - Find all tasks marked [x] in Tasks/Main.md
2. **Archive Task Files** - Move completed task files to Tasks/_archive/
3. **Clean Main.md** - Remove completed tasks from the active list
4. **Review Uncompleted** - Assess tasks that didn't get done this week
5. **Prepare Next Week** - Set up fresh task list for the coming week
6. **Summary** - Show what was archived and what's pending

This complements `/today` (morning startup) and `/eob` (daily processing) by providing weekly maintenance.

**Execution Context**: This skill runs as a forked conversation using the `assistant` agent, which provides full access to vault operations, file management, and task manipulation.

## Workflow Steps

### Step 1: Read Tasks/Main.md

Read the current state of the task list. Parse the structure to extract:
- Completed tasks: Lines with `- [x]`
- Uncompleted tasks: Lines with `- [ ]`
- Section they're in: "Due Today", "Due This Week", "Ongoing"

### Step 2: Identify Completed Task Files

For each completed task `[x]`, extract the task name from wiki-link:
- Pattern: `- [x] [[Task Name]]`
- File path: `Tasks/Task Name.md`

**Verify file exists** and read full content for archival.

### Step 3: Present Completion Summary

Show user:
- Completed tasks that will be archived (with metadata)
- Uncompleted tasks that need rescheduling
- Proposed actions with options for uncompleted tasks

### Step 4: Handle Uncompleted Tasks

Ask user how to handle tasks not completed this week:

**Option A: Keep existing due dates** (tasks become overdue)

**Option B: Auto-reschedule to next Friday** (recommended)

**Option C: Review individually**
- Show each task one-by-one
- Ask: "Reschedule to next week, move to Ongoing, or archive as not needed?"

### Step 5: Execute Archival

After user approval:

#### Archive Completed Task Files
- Move files to `Tasks/_archive/`
- Verify moves succeeded

#### Update Uncompleted Task Due Dates (if Option B or C chosen)
- Update `dueDate` in frontmatter to next Friday

#### Clean Tasks/Main.md
- Remove all lines with `- [x]`
- Clear "Due Today" section (clean slate)
- Keep uncompleted tasks in "Due This Week"
- Preserve "Ongoing" section unchanged

### Step 6: Generate Next Week Summary

Display:
- Number of tasks completed and archived
- Next week's task count
- Tasks/Main.md status confirmation

## Special Cases

### No Completed Tasks
Still clean up Main.md structure, prepare for next week.

### All Tasks Completed
Archive all, clear Main.md completely.

### Orphaned Links
Task in Main.md but file doesn't exist. Recommend removing orphaned links.

### Tasks with Project Folders
Only move standalone task files, not project folders.

### PM-Synced Tasks
> **Conditional**: Only applies if project management integration is configured.

If a completed task was synced from a PM tool (has `linear` or similar tag):
- Archive normally
- Remind user to mark as Done in the PM tool if not already done

## Date Calculation

Use bash `date` command to calculate:
- This week's Friday
- Next week's Friday

## Workflow Checklist

When running `/eow`:

- [ ] Read Tasks/Main.md
- [ ] Parse completed and uncompleted tasks
- [ ] Identify completed task files
- [ ] Present completion summary
- [ ] Ask how to handle uncompleted tasks (A/B/C)
- [ ] Move completed task files to _archive/
- [ ] Update uncompleted task due dates (if requested)
- [ ] Clean Tasks/Main.md
- [ ] Display end-of-week summary
- [ ] Confirm completion

## Workflow Comparison

| Aspect | `/eob` | `/today` | `/eow` |
|--------|--------|----------|--------|
| **Frequency** | Daily (evening) | Daily (morning) | Weekly (Friday) |
| **Purpose** | Process Inbox | Sync & plan day | Archive & prepare week |
| **Input** | Inbox files | PM tool + Email + Tasks | Tasks/Main.md |
| **Output** | Task/Memory files | Updated Main.md | Archived tasks + clean Main.md |

## Tips for Best Results

1. **Run on Friday afternoon/evening**
2. **Review before archiving** - Make sure tasks are truly complete
3. **Be realistic about rescheduling** - Don't just push everything forward
4. **Archive liberally** - Completed is completed
5. **Check PM tool status** - Mark issues Done if tasks are archived
