# CLAUDE.md - Ambient Context Vault Guide

This file provides comprehensive guidance to Claude Code when working with an ambient-context vault for personal or professional knowledge management.

---

## Table of Contents

1. [Overview](#overview)
2. [First-Time Setup](#first-time-setup)
3. [Vault Structure](#vault-structure)
4. [Key Workflows](#key-workflows)
5. [Task Management System](#task-management-system)
6. [Memory Notes](#memory-notes)
7. [Daily Notes Pattern](#daily-notes-pattern)
8. [Writing Organization](#writing-organization)
9. [Frontmatter Reference](#frontmatter-reference)
10. [Working with This Vault](#working-with-this-vault)
11. [Configuration](#configuration)
12. [Integrations](#integrations)
13. [Remote Access via MCP](#remote-access-via-mcp)
14. [Agent and Tool Usage](#agent-and-tool-usage)

---

## Overview

This is an ambient-context vault -- a structured personal knowledge management system powered by Claude Code. The vault uses defined workflows for capturing, organizing, and processing work items, with optional integrations for email, calendar, messaging, CRM, and project management tools.

**Key Principle**: Process quick captures through workflows that move content from Inbox to permanent locations (Memory, Tasks, Research, Writing), with completed items flowing to `_archive/` folders.

**Recommended**: Use [Obsidian](https://obsidian.md) to open the vault folder for manual browsing and editing. Obsidian is not required -- the vault is just a folder of markdown files.

---

## First-Time Setup

If this vault has not been configured yet, run:

```
/setup
```

The setup wizard will walk you through:
- Choosing personal or professional context
- Setting your vault location and timezone
- Configuring optional integrations
- Setting up the MCP server for remote access
- Enabling indexed search

Configuration is stored in `.claude/state/setup-config.json`.

---

## Vault Structure

```
vault/
├── Inbox/              # Daily notes and quick captures (processed regularly)
│   └── _archive/       # Archived daily notes and processed captures
├── Memory/             # Long-term reference notes (people, companies, topics)
│   └── _archive/       # Archived memory notes
├── Research/           # Ideas, research topics, reading lists
│   └── _archive/       # Archived research
├── Tasks/              # Task management with Main.md as central hub
│   ├── Main.md         # Central task hub (Due Today, Due This Week, Ongoing)
│   ├── [Project Name]/ # Long-term projects (folders with their own Main.md)
│   └── _archive/       # Completed tasks (archived weekly)
├── Writing/            # Drafts and published pieces
│   ├── [Platform]/     # Platform-specific posts (LinkedIn, Blog, etc.)
│   └── _archive/       # Published pieces
└── _templates/         # Note templates
```

### Section Descriptions

**Inbox/** - Temporary capture area. Where daily notes and quick captures happen. Processed regularly via `/eob`. Should be empty of unprocessed items by end of day.

**Memory/** - Long-term reference. Persistent knowledge base for people, companies, topics. Uses YAML frontmatter with tags. Referenced from Tasks, Writing, Research via [[wiki-links]].

**Research/** - Ideas and investigation. Research topics, reading lists, things worth exploring.

**Tasks/** - Day and week organization. Central hub: `Tasks/Main.md`. Ad-hoc tasks get their own files. Long-term efforts get dedicated folders (projects). Completed tasks archived weekly via `/eow`.

**Writing/** - Drafts and published content. In-progress drafts at root level, platform-specific folders for social media, blog, etc.

---

## Key Workflows

### `/today` - Morning Startup

Start your workday by syncing external tools, reviewing tasks, and setting priorities.

**Steps**:
1. Sync project management tickets (if configured)
2. Check recent emails (if configured)
3. Check today's calendar (if configured) -- **convert UTC times to your timezone**
4. Scan existing vault tasks
5. Present analysis (new items, overdue tasks, today's schedule)
6. Create task files for new items
7. Display morning summary

### `/eob` - End of Business Day

Process quick captures from Inbox and organize into permanent vault locations.

**Steps**:
1. Scan all files in `Inbox/`
2. Extract messaging context (if configured)
3. Process emails (if configured)
4. Check CRM updates (if configured)
5. Convert hashtags to YAML frontmatter metadata
6. Categorize: Tasks, Memory, Research, or Writing
7. Create files with frontmatter, update `Tasks/Main.md`
8. Mark processed items, archive fully processed files

### `/eow` - End of Week

Complete your week by archiving finished tasks and preparing for next week.

**Steps**:
1. Read `Tasks/Main.md`, find completed `[x]` tasks
2. Present weekly summary
3. Handle uncompleted tasks (keep dates, reschedule to next Friday, or review individually)
4. Move completed task files to `Tasks/_archive/`
5. Clean `Tasks/Main.md` for next week

### `/meeting-prep` - Meeting Preparation

Comprehensive pre-meeting context gathering.

**Steps**:
1. Identify meeting (auto-detect from calendar or user-specified)
2. Load Memory context for attendees and companies
3. Fetch CRM data (if configured)
4. Find related tasks, PM issues, emails
5. Generate meeting notes document in `Inbox/Meeting - [Title].md`

### `/context-finder` - Cross-System Search

Search and synthesize information about a person, company, project, or topic across all sources.

### `/email-triage` - Email Analysis

Deep email analysis using Memory notes for context-aware prioritization.

### `/extract-teams-context` - Messaging Extraction

Extract messages, participants, and action items from messaging platforms.

---

## Task Management System

### Central Hub: `Tasks/Main.md`

```markdown
## Due Today
- [ ] [[Task Name]]

## Due This Week
- [ ] [[Task Name]]

## Ongoing
- [[Recurring Task]]
```

### Task Processing Flow

1. **Quick capture in Inbox**: Use hashtags for tagging (`#today`, `#week`, other categories)
2. **During `/eob`**: Convert hashtags to frontmatter, create task files
3. **Task files**: Ad-hoc tasks as individual files in `Tasks/`
4. **Projects**: Long-term efforts as subfolders with their own `Main.md`
5. **PM sync**: Tasks from project management tools added via `/today`
6. **Completion**: Finished tasks archived via `/eow` (weekly)

---

## Memory Notes

Long-term reference about people, companies, projects, and topics.

```yaml
---
tags:
  - prospect
  - customer
---

# Company/Person Name

Context, relationship info, contact details, relevant history.
```

Use [[wiki-links]] in task files to reference Memory notes:
```markdown
# Send Onboarding Instructions
Send [[Jane Smith]] instructions to sign up...
```

---

## Daily Notes Pattern

**Location**: `Inbox/YYYY-MM-DD.md`

```markdown
## Quick capture
- [ ] Task description #hashtag #category
- [ ] Another item #today

## Resources
- https://example.com/article
```

**Hashtag rules**:
- `#today` -> `dueDate: YYYY-MM-DD` (today's date)
- `#week` -> `dueDate: YYYY-MM-DD` (this Friday)
- Other hashtags -> `tags` frontmatter array

---

## Writing Organization

- **Drafts**: Root level of `Writing/`
- **Platform-specific**: `Writing/LinkedIn/`, `Writing/Blog/`, etc.
- **Long-form**: Dedicated folders for multi-part projects
- **Published**: Move to `Writing/_archive/`

---

## Frontmatter Reference

### Task
```yaml
---
dueDate: 2026-01-10
tags:
  - category
---
```

### Memory Note
```yaml
---
tags:
  - prospect
  - customer
---
```

### Processed Inbox File
```yaml
---
processed: true
tags:
  - processed
---
```

---

## Working with This Vault

1. **ALWAYS use code for calculations** - dates, times, math, conversions. Never calculate mentally.

2. **ALWAYS verify current date** with `date` command before any date-dependent operation.

3. **ALWAYS convert calendar times to user's timezone** - check `setup-config.json` for timezone. Calendar APIs typically return UTC.

4. **Respect the folder structure** - don't modify without asking.

5. **Use YAML frontmatter** for metadata - always include `tags` array, `dueDate` for time-sensitive items.

6. **Use [[wiki-links]]** for internal references between notes.

7. **Process items through workflows** - `/today` (morning), `/eob` (evening), `/eow` (Friday).

8. **Archive completed items** to `_archive/` folders via `/eow`.

9. **Keep Inbox temporary** - process and archive daily.

10. **Maintain Tasks/Main.md** as single source of truth for current tasks.

11. **When processing Inbox**: Convert `#today`/`#week` to `dueDate`, other hashtags to `tags`, mark with `#processed` or `processed: true`.

---

## Configuration

Configuration lives in `.claude/state/setup-config.json`. Run `/setup` to create or modify it.

Key fields:
- `contextType`: "personal" or "professional"
- `vaultPath`: Absolute path to the vault
- `timezone`: IANA timezone (e.g., "America/New_York", "Europe/London")
- `integrations`: Which tools are connected (email, calendar, messaging, CRM, PM)
- `mcpServer`: Remote access configuration
- `search`: Search provider configuration

### Checking configuration in workflows

All workflows should read setup-config.json to determine which features are available:
- Skip email steps if `integrations.email.enabled` is false
- Skip PM sync if `integrations.projectManagement.enabled` is false
- Skip CRM lookups if `integrations.crm.enabled` is false
- Use configured timezone for all date/time operations

---

## Integrations

### Built-in (pre-configured)

| Integration | Provider | Covers |
|------------|----------|--------|
| Office 365 | MS365 MCP | Email, Calendar, Teams messaging |
| Attio | Attio API | CRM (companies, deals, notes) |
| Linear | Linear API | Project management (issues, projects) |

### Custom (Claude helps configure)

During `/setup`, if you choose a non-built-in provider (Gmail, Salesforce, Jira, Slack, etc.), Claude Code will help you configure the integration.

---

## Remote Access via MCP

The vault can be accessed remotely via an MCP (Model Context Protocol) server, enabling use from Claude Desktop, Cursor, iOS Shortcuts, voice assistants, or other AI interfaces.

### MCP Server

**Location**: `.claude/mcp-server/`
**Start**: `cd .claude/mcp-server && ./start.sh` (or `./start.sh --no-auth` for Tailscale/local)

### Available Tools

| Tool | Purpose |
|------|---------|
| `list_toc` | Get vault Table of Contents |
| `list_tasks` | Get current task list |
| `get_memory` | Lookup person/company from Memory |
| `find_context` | Search vault by query, type, or tags |
| `add_quick_note` | Add quick capture to Inbox |
| `update_task` | Mark task complete or add notes |
| `prepare_meeting` | Run meeting prep workflow |
| `update_meeting_note` | Add content to meeting notes |

### Access Modes

- **Local only**: `127.0.0.1:9000`, no auth needed
- **Tailscale**: Accessible from Tailscale network, network-level security
- **Custom**: Configure OAuth or API key authentication

---

## Agent and Tool Usage

### Specialized Agents

| Task | Agent | Description |
|------|-------|-------------|
| Messaging extraction | `teams` | Message extraction, channel monitoring, participant tracking |
| Workflow management | `context-manager` | Cross-system queries, workflow orchestration |
| CRM lookups | `attio` | Search companies, get deals and notes (if Attio configured) |
| Remote operations | `mcp-assistant` | Headless vault operations for external systems |

### Calendar Tips (Office 365)

When using MS365 MCP for calendar:
- Use `get-calendar-view` with explicit `startDateTime` and `endDateTime`
- Do NOT use `list-calendar-events` with `days` parameter
- Example: `{"startDateTime": "2026-01-14T00:00:00", "endDateTime": "2026-01-14T23:59:59"}`
- ALWAYS convert returned UTC times to user's configured timezone
