---
name: end-of-business-day
description: Process end-of-business-day workflow for personal knowledge vault. Analyze Inbox items, convert hashtags to frontmatter metadata, categorize content into appropriate vault sections (Tasks, Memory, Research, Writing), and suggest how to organize daily captures. Use when processing daily notes and preparing Tasks/Main.md for the next day.
context: fork
agent: assistant
---

# End of Business Day (`/eob`) Workflow

Process your daily inbox captures and organize them into permanent vault locations with proper metadata.

## Overview

The `/eob` workflow automates your end-of-day capture processing:

1. **Scan all Inbox files** (daily notes, meeting notes, tool discoveries, etc.)
2. **Extract messaging context** via messaging agent (if messaging integration configured)
3. **Extract email context** - Customer/prospect focused email processing (if email integration configured)
4. **Check CRM updates** - Sync recent company/deal changes (if CRM integration configured)
5. **Convert hashtags to frontmatter** metadata
6. **Categorize content** and suggest permanent locations
7. **Show combined analysis** for approval before making changes
8. **Move processed items** to appropriate sections
9. **Create/update Memory notes** from messaging/email/CRM (selective, customer-focused)
10. **Archive fully processed files** to `Inbox/_archive/`
11. **Clean up incomplete items** and prompt for tomorrow's reminders
12. **Commit changes to git** to track daily processing

## Configuration

Check `.claude/state/setup-config.json` for:
- **timezone**: User's timezone for date calculations
- **integrations.messaging**: Messaging platform (e.g., Teams)
- **integrations.email**: Email provider (e.g., Office 365)
- **integrations.crm**: CRM system (e.g., Attio)

## Workflow Steps

### 1. Review All Inbox Files

Scan all files in the `Inbox/` directory, including:
- **Daily notes**: `Inbox/YYYY-MM-DD.md` with "Quick capture" section
- **Meeting notes**: `Inbox/Meeting - Topic.md`
- **Tool discoveries**: `Inbox/Tool - Name.md`
- **Other captures**: Any non-archived files in Inbox

### 1.5. Extract Messaging Context

> **Conditional**: Only run if messaging integration is configured in `.claude/state/setup-config.json`

If messaging integration is configured (e.g., Teams), invoke the messaging agent to process conversations since the last EOB run. The agent will:

1. Load messaging memory (semantic understanding of channels)
2. Fetch DM conversations and monitored channel messages
3. Extract participants from conversations
4. Apply pattern matching to detect action items
5. Build conversation summaries per participant
6. Cross-reference with existing Memory notes
7. Apply smart tags based on channel context
8. Return structured data about Memory notes and tasks

If messaging memory doesn't exist or has no monitored channels, skip this step.

### 1.6. Extract Email Context

> **Conditional**: Only run if email integration is configured in `.claude/state/setup-config.json`

Process emails since last EOB run with **selective, customer-focused** approach.

**Philosophy**: Don't log every email. Focus on:
1. **Customer communications** (highest priority)
2. **Prospect interactions** (important decisions, status changes)
3. **Action items** (regardless of sender)
4. **Decisions and agreements** (things worth remembering)

**Step 1: Load Tracked Companies**
Get list of customers and prospects from Memory/Customers.

**Step 2: Fetch Emails Since Last EOB**
Use configured email provider to fetch recent emails.

**Step 3: Categorize Emails by Priority**

| Priority | Source | Action |
|----------|--------|--------|
| **HIGH** | Customer | Track all interactions, update Memory note |
| **MEDIUM** | Known prospect | Track decisions, meetings, status changes |
| **LOW** | Team/Internal | Only extract action items |
| **IGNORE** | Newsletters, notifications | Skip |

**Step 4: Extract Relevant Information**

For Customer Emails: Always log to customer Memory note, extract decisions, agreements, blockers, action items.

For Prospect Emails: Log only significant interactions (meetings, proposals, status changes, decisions).

For Other Emails: Only extract explicit action items with deadlines.

**Step 5: Detect New Contacts (Confirmation Required)**
ASK FOR CONFIRMATION before adding unknown senders to Memory.

**Memory Update Format**: Append to "## Email Log" section in Memory notes.

**What NOT to Log**: "Thanks!", internal CC'd emails, newsletters, system notifications.

### 1.7. Check CRM Updates

> **Conditional**: Only run if CRM integration is configured in `.claude/state/setup-config.json`

Process recent CRM updates to sync company and deal information into the vault.

**Philosophy**: CRM is the source of truth for customer/prospect data. One-way sync: CRM -> Vault.

**CRITICAL**: Only UPDATE existing Memory notes. Do NOT create new Memory notes for every company in CRM.

**What to Check**:
1. Recently updated companies (since last EOB)
2. New deals created or status changes
3. Deal stage movements
4. Notes/interactions added to company records

**Track Deal Status Changes** for companies that ALREADY have Memory notes:

| Change | Action |
|--------|--------|
| Prospect stage advance | Update note with new stage |
| Closed-won | Move from `Prospects/` to `Customers/` |
| Closed-lost | Move to `Prospects/_archive/` |
| Deal value change | Update frontmatter |

**Important Notes**:
- CRM is source of truth: Don't edit deal stages in vault manually
- One-way sync: CRM -> Vault only
- Only update existing notes: Do NOT create new Memory notes from CRM data
- Manual Memory note creation: Create the Memory note first, then future syncs update it

### 2. Hashtag-to-Frontmatter Conversion

Convert hashtags in each item into YAML frontmatter metadata:

**Time-sensitive tags** (mutually exclusive):
- `#today` -> `dueDate: YYYY-MM-DD` (today's date)
- `#week` -> `dueDate: YYYY-MM-DD` (next Friday, or this Friday if before 5pm)

**Category tags** (can be multiple):
- Any other hashtags -> `tags` array in frontmatter

### 3. Categorize by Destination

**-> Tasks/** (for action items with deadlines or priorities)
- Create individual files for each task: `Tasks/Task Name.md`
- Reference each task in `Tasks/Main.md` with wiki links
- Include email context if the task relates to emails

**-> Tasks/[Project Name]/** (for long-term project work)
- Multi-part projects or ongoing initiatives get a folder

**-> Memory/** (for long-term reference about people, companies, projects)
- Contact notes, company research, customer information
- Use `tags` frontmatter with relationship categories

**-> Research/** (for ideas, research topics, reading lists, resource links)
- Create Research notes for URLs and resource links with descriptive titles

**-> Writing/** (for draft content and publishing)
- Platform-specific: `Writing/LinkedIn/`, `Writing/Twitter/`, etc.

**-> Delete** (if not valuable to keep)

### 4. Analysis Phase (Approval Required)

Present your analysis before executing, including Inbox items and integration results.

Show:
- Inbox items found with proposed destinations
- Messaging context summary (if applicable)
- Email processing summary (if applicable)
- CRM updates (if applicable)
- New contacts pending confirmation
- Overall summary of proposed changes

### 5. Execute Changes

Once approved:
1. Create task files in `Tasks/` with frontmatter metadata (include email/messaging context)
2. Add wiki links to `Tasks/Main.md` in appropriate sections
3. Create/update Memory notes from messaging and email conversations
4. Create research/memory/writing files from Inbox
5. Mark processed items with `#processed` (daily notes) or `processed: true` (other files)
6. Update state tracking in `.claude/state/last-eob-run.json`

### 6. Mark Processed Items

- **Daily notes**: Add `#processed` hashtag to each processed item
- **Other Inbox files**: Add `processed: true` to frontmatter
- **Fully processed files**: Move to `Inbox/_archive/`

### 7. Prepare Tomorrow

Ask if there are any reminders or tasks to prepare for the next day.

### 8. Commit Changes to Git

Create a git commit to track the day's processing:

**Commit Message Format:**
```
EOB: Process daily captures for YYYY-MM-DD

- Created X task files
- Created X memory/research/writing files
- Archived X fully processed files
- Updated Tasks/Main.md
```

## Task Management Pattern

All bespoke tasks follow this pattern:

**File**: `Tasks/Task Name.md`
```yaml
---
dueDate: YYYY-MM-DD
tags:
  - category
  - context
---

# Task Name

Task description and relevant context.
```

**Reference**: `Tasks/Main.md`
```markdown
## Due Today
- [ ] [[Task Name]]

## Due This Week
- [ ] [[Another Task]]

## Ongoing
- [[Recurring Task]]
```

## Workflow Checklist

When running `/eob`:

- [ ] Scan all files in `Inbox/` directory
- [ ] Extract messaging context (if messaging configured)
- [ ] Extract email context (if email configured)
- [ ] Check CRM updates (if CRM configured)
- [ ] Convert hashtags to frontmatter metadata
- [ ] Categorize each item by destination
- [ ] Present analysis for approval
- [ ] Create new task files in `Tasks/`
- [ ] Add wiki links to `Tasks/Main.md`
- [ ] Create memory/research/writing files
- [ ] Mark processed items
- [ ] Move fully processed files to `Inbox/_archive/`
- [ ] Ask for tomorrow's reminders
- [ ] Commit all changes to git
- [ ] Confirm completion

## Tips for Best Results

1. **One task = one file** - Each bespoke task gets its own file
2. **Always reference in Main.md** - Use wiki links to connect task files
3. **Be consistent with hashtags** - Use the same tags repeatedly
4. **Include email context** - Search for related emails when creating tasks
5. **Convert links to Research notes** - URLs in Resources sections become Research notes
6. **Keep Inbox empty** - Process everything or explicitly keep unprocessed items
