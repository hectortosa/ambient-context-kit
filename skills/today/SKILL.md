---
name: today
description: Morning startup workflow to sync project management tickets, check emails, review calendar, and prepare task list for the day
context: fork
agent: assistant
---

# Today (`/today`) Workflow

Start your workday with a comprehensive morning routine: sync project management tickets, check recent emails, review today's calendar, and organize your tasks.

## Overview

The `/today` workflow is your daily startup routine:

1. **Sync Project Management** - Check for new tickets assigned to you (if PM integration configured)
2. **Check Emails** - Review all emails since last run (if email integration configured)
3. **Check Calendar** - See today's meetings and available focus time (if calendar integration configured)
4. **Scan Vault** - Review all existing tasks in your vault
5. **Analyze** - Identify what's new, what's due today, what's unscheduled
6. **Propose** - Show you what to do and ask for approval
7. **Execute** - Create/update task files and organize your day
8. **Summary** - Display your daily task count, email summary, and calendar overview

This complements the `/eob` workflow (which processes Inbox captures at day's end) by preparing your task list at day's start.

## Configuration

Before running this workflow, check `.claude/state/setup-config.json` for:
- **timezone**: User's timezone for calendar time display and date calculations
- **integrations.projectManagement**: PM tool configuration (e.g., Linear)
- **integrations.email**: Email provider configuration (e.g., Office 365)
- **integrations.calendar**: Calendar provider configuration (e.g., Office 365)

## Workflow Steps

### Step 1: Fetch Project Management Tickets

> **Conditional**: Only run if project management integration is configured in `.claude/state/setup-config.json`

Retrieve all your active issues using the configured PM tool.

**If Linear is configured**, use two separate API calls:

**Call 1: Fetch "In Progress" issues**
- Use Linear API: `list_issues` with parameters:
  - `assignee: "me"`
  - `state: "In Progress"`
  - `includeArchived: false`
  - `limit: 250`

**Call 2: Fetch "Todo" issues**
- Use Linear API: `list_issues` with parameters:
  - `assignee: "me"`
  - `state: "Todo"`
  - `includeArchived: false`
  - `limit: 250`

**For each retrieved issue, extract:**
- `identifier`: Issue ID
- `title`: Issue title
- `url`: Issue URL
- `description`: Full description
- `project`: Project name
- `status`: Current status
- `labels`: Any labels attached
- `dueDate`: Due date if set

### Step 2: Check Recent Emails

> **Conditional**: Only run if email integration is configured in `.claude/state/setup-config.json`

Review all emails since the last time `/today` was run.

**CRITICAL - Time Range Logic**:
- **On Monday**: Check emails since last Friday (roughly 3 days ago)
- **On Tuesday-Friday**: Check emails since yesterday (roughly 1 day ago)
- **After vacation/gap**: Check emails for the full gap period
- **Calculation**:
  - Use bash `date` command to determine current day of week
  - If Monday: Look back to last Friday (3 days)
  - If Tuesday-Friday: Look back 1 day (24 hours)
  - Maximum lookback: 7 days

**If Office 365 is configured**, use MS365 API: `execute-tool` with `list-mail-messages`
- Parameters:
  - `filter: "receivedDateTime ge [calculated-time-since-last-run]"`
  - `top: 100`
  - `orderby: "receivedDateTime desc"`
  - `select: "subject,from,receivedDateTime,bodyPreview,importance,hasAttachments,isRead"`

**For each email, extract:**
- `from`: Sender name and email
- `subject`: Email subject line
- `receivedDateTime`: When received
- `bodyPreview`: First ~140 characters of body
- `importance`: Normal, Low, or High
- `hasAttachments`: Boolean
- `isRead`: Boolean

**Categorize emails:**
- **Urgent/Important**: High importance or from key contacts (customers, team leads)
- **Team**: From internal team members
- **External**: From customers, prospects, partners
- **Other**: General emails

**Process self-sent vault emails**: Emails from self with subject "[Obsidian Vault]" should be extracted and added to vault:

**Detection criteria:**
- From: your own email address
- Subject starts with: "[Obsidian Vault]"
- Contains links, hashtags, or content to capture

**Processing:**
1. Extract link/content from email body
2. Parse hashtags (convert to frontmatter tags)
3. Determine destination:
   - Default: `Research/` (for links, articles, resources)
   - If hashtags suggest `#memory`, `#customer`, `#prospect`: `Memory/`
   - If hashtags suggest `#writing`, `#social`, `#linkedin`: `Writing/`
4. Create note with frontmatter:
   ```yaml
   ---
   tags:
     - [extracted-hashtags]
   source: email
   added: YYYY-MM-DD
   ---

   # [Title from link or subject]

   [Link or content]

   ## Notes

   [Any additional context from email]
   ```
5. Mark email for archiving after processing

### Step 3: Check Today's Calendar

> **Conditional**: Only run if calendar integration is configured in `.claude/state/setup-config.json`

Fetch all calendar events for today.

**CRITICAL - Timezone Handling**:
- Check `.claude/state/setup-config.json` for user's timezone
- **MUST** use ISO 8601 format with timezone offset for datetime parameters
- **DO NOT** use UTC times without timezone offset - this causes events to be missed
- **NEVER** show UTC times to user - always convert to local timezone

**If Office 365 is configured**, use MS365 API: `execute-tool` with `list-calendar-events`
- Parameters:
  - `startDateTime: [today 00:00 in user's local timezone]`
  - `endDateTime: [today 23:59 in user's local timezone]`
  - `orderby: "start/dateTime"`
  - `select: "subject,start,end,attendees,location,isOnlineMeeting,onlineMeeting"`

**For each event, extract:**
- `subject`: Meeting title
- `start`: Start time (convert from UTC to local timezone)
- `end`: End time (convert from UTC to local timezone)
- `attendees`: List of participants
- `location`: Physical or online location
- `isOnlineMeeting`: Boolean
- `onlineMeeting.joinUrl`: Meeting link if applicable

**Analyze calendar:**
- **Meeting count**: Total meetings today
- **Meeting hours**: Total time in meetings
- **Focus blocks**: Gaps of 2+ hours for deep work
- **Back-to-back**: Meetings with no buffer time
- **Conflicts**: Overlapping meetings

### Step 4: Scan Existing Tasks

Read all task files in your vault:

- Scan `Tasks/` directory (excluding `_archive/`)
- For each task file, parse YAML frontmatter:
  - Extract `dueDate` (if present)
  - Extract `tags` array
- Read `Tasks/Main.md` to see current task list
- Identify tasks without `dueDate` (unscheduled work)

### Step 5: Present Comprehensive Analysis

Show user the complete morning overview including PM issues, emails, calendar, and tasks:

#### New PM Issues Not Yet in Vault
Display all active issues that don't have corresponding task files.

#### Existing Tasks Summary
Show tasks organized by Due Today, Due This Week, and Unscheduled.

#### Recent Emails Summary
Show categorized email summary with urgent items flagged.

#### Today's Calendar Summary
Show today's schedule with meeting count and focus time.

#### Issues Found
- Date format inconsistencies
- Missing wiki-links in Tasks/Main.md

### Step 6: Propose Actions

Ask for approval of changes:
- Create new task files from PM issues
- Create task files from urgent emails
- Create vault notes from self-sent emails
- Fix existing issues (date formats, wiki-links)

### Step 7: Execute Changes

After user approval:

#### Create Task Files for New PM Issues

**Filename**: `Tasks/[Issue Title].md`

**Content**:
```yaml
---
dueDate: YYYY-MM-DD
tags:
  - [pm-tool-name]
  - [label1]
  - [label2]
project: [Project Name]
status: [Status]
---

# [Issue Title]

[ISSUE-ID](issue-url)

## Description

[Issue description]
```

**Guidelines**:
- File name uses issue title only (no ID prefix)
- Auto-assign `dueDate` to this Friday if not set
- Include PM tool name tag + any labels
- Add `project` frontmatter property
- Add `status` frontmatter property
- Include clickable link to issue at top

#### Create Task Files from Urgent Emails

**Filename**: `Tasks/[Action description].md`

```yaml
---
dueDate: YYYY-MM-DD
tags:
  - email
  - urgent
  - [sender-category]
source: email
---

# [Action Description]

From: [Sender Name] <[email]>
Received: [Date/Time]
Subject: [Original Subject]

## Email Preview

[Body preview from email]

## Action Required

[Description of what needs to be done]
```

#### Update Tasks/Main.md

Add new tasks to appropriate sections (Due Today, Due This Week).

#### Fix Date Format Inconsistencies

Update any task files to use standard `YYYY-MM-DD` format.

### Step 8: Morning Summary

Display comprehensive results including tasks, emails, and calendar overview.

## Workflow Checklist

When running `/today`:

- [ ] Use bash `date` to determine current day of week
- [ ] Calculate email lookback period (3 days for Monday, 1 day otherwise)
- [ ] Fetch PM issues (if integration configured)
- [ ] Check recent emails (if email integration configured)
- [ ] Detect self-sent "[Obsidian Vault]" emails
- [ ] Check today's calendar events (if calendar configured, use local timezone)
- [ ] Scan all task files in Tasks/
- [ ] Identify new issues not yet in vault
- [ ] Identify tasks without due dates
- [ ] Check for format inconsistencies
- [ ] Present comprehensive analysis
- [ ] Propose and create task files (with approval)
- [ ] Update Tasks/Main.md
- [ ] Display morning summary

## Common Scenarios

### Scenario 1: PM Issue Already in Vault
**Detection**: Task file exists with issue link
**Action**: Skip creation, update existing file if status changed

### Scenario 2: Task Without Due Date
**Action**: Suggest setting a due date or moving to "Ongoing" section

### Scenario 3: Overdue Task
**Action**: Highlight to user, ask if should be archived or rescheduled

### Scenario 4: Task Not in Main.md
**Action**: Add wiki-link to appropriate section with user approval

### Scenario 5: Urgent Email Requires Immediate Action
**Action**: Flag email, propose task with `dueDate: today`, suggest checking calendar for available time

### Scenario 6: Calendar Shows Back-to-Back Meetings
**Action**: Highlight with warning, show total meeting time, suggest buffer time

### Scenario 7: Self-Sent "[Obsidian Vault]" Email
**Action**: Extract link and hashtags, create Research/Memory/Writing note based on hashtags

## Workflow Comparison

| Aspect | `/eob` (End of Day) | `/today` (Start of Day) |
|--------|-----|-----|
| **Purpose** | Process Inbox captures | Morning prep: PM sync + email + calendar |
| **Trigger** | End of workday | Start of workday |
| **Input** | Inbox files + hashtags | PM API + Email + Calendar + existing tasks |
| **Output** | Task/Memory/Research files | Updated Tasks/Main.md + morning summary |
| **External APIs** | None (vault-only) | PM tool, Email, Calendar (all conditional) |

## Tips for Best Results

1. **Run `/today` first thing**: Make it your morning routine
2. **Review before approving**: Check proposed changes including email-based tasks
3. **Triage emails in context**: With calendar visible, better prioritize responses
4. **Block focus time**: Use calendar analysis to protect deep work time
5. **Keep Inbox separate**: `/today` is for morning prep, use `/eob` for daily note processing
6. **Self-sent vault emails**: Email yourself with subject "[Obsidian Vault]" + link + hashtags
7. **Timezone critical**: Always use your configured timezone for calendar queries
