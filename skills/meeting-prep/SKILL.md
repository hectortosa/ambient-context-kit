---
name: meeting-prep
description: Comprehensive pre-meeting context gathering using Memory notes, vault content, project management issues, and email history.
context: fork
agent: assistant
---

# Meeting Preparation Workflow

Comprehensive pre-meeting context gathering using Memory notes, vault content, project management issues, and email history.

## Overview

The meeting prep workflow helps you walk into any meeting fully prepared by:
1. Automatically detecting your next meeting (if not specified) using current time and calendar
2. Loading Memory context for all attendees and companies
3. Finding related tasks, projects, and PM issues
4. Reviewing recent email conversations (if email integration configured)
5. Fetching CRM context (if CRM integration configured)
6. Identifying decisions needed and topics to cover
7. Creating a structured meeting notes file in Inbox with all context and source attribution

## When to Use

- Before 1:1s with team members
- Before customer/prospect calls
- Before important internal meetings
- Before investor/advisor meetings
- Any meeting where context matters

## Important Notes

**CRITICAL - Always get current time first**:
- When user doesn't specify a meeting, **ALWAYS** use Bash tool first: `date '+%Y-%m-%d %H:%M:%S %Z'`
- Never assume or guess the current time

**Timezone Handling**:
- Check `.claude/state/setup-config.json` for user's timezone
- Calendar API may use UTC - convert to local time for display
- When querying calendar, use appropriate timezone-aware parameters

## Workflow Steps

### Step 1: Identify Meeting and Attendees

**If user doesn't specify a meeting**:
1. Get current date/time via Bash
2. Query calendar for today's events
3. Filter to find next upcoming meeting
4. Present for user confirmation

**From User Request**: Parse person name, meeting title, or time.

### Step 2: Load Memory Context

**For Each Attendee**:
1. Search Memory folder for person's name
2. Load Memory note if found (tags, role, company, context)
3. If person has company, load company Memory note too
4. If not found, note as "Unknown attendee"

### Step 3: Fetch CRM Context

> **Conditional**: Only run if CRM integration is configured in `.claude/state/setup-config.json`

When a company is identified:
1. Search CRM for the company
2. Get deal information (stage, value, history)
3. Get CRM notes attached to the company record

### Step 4: Find Related Tasks

Search Tasks/ folder for:
- Tasks mentioning attendee names
- Tasks mentioning companies
- Tasks related to meeting topic
- Tasks due before/during meeting timeframe

### Step 5: Search PM Issues

> **Conditional**: Only run if project management integration is configured.

Search for issues related to meeting attendees, companies, or topics.

### Step 6: Review Email History

> **Conditional**: Only run if email integration is configured.

Search for emails from/to attendees in last 30 days. Categorize by decisions pending, questions asked, commitments made.

### Step 7: Identify Topics and Decisions

**IMPORTANT - Keep it concise**:
- Meeting objectives should reflect ONLY what the meeting title/description say
- Avoid detailed talking points or scripts
- Write a short paragraph suggesting interesting conversation topics
- Focus on key themes rather than exhaustive lists

### Step 8: Generate Meeting Notes Document

Create structured output:

```markdown
---
tags:
  - meeting
  - [additional tags]
---
# Meeting - [Meeting Title]

**Date**: [Date] at [Time]
**Duration**: [Minutes]
**Link**: [Meeting link if available]

[Brief description]

## Attendees

### [[Person 1]]
[Brief summary - role, company, relationship]
**Source**: Memory note [[Person 1]]

## Context

### CRM
[Deal and pipeline info if CRM configured]
**Source**: CRM

### PM Issues
[Relevant issues if PM configured]
**Source**: [Issue links]

### Emails
[Recent email threads if email configured]

### Vault
[Related tasks, research, previous meetings]

---

## Meeting Notes
[Space for live notes]

## Decisions Made
[Space for decisions]

## Follow-up Actions
- [ ] [Action item]

---

## Analysis
[Populated post-meeting by transcript analysis tool]
```

### Step 9: Create Meeting Notes File in Inbox

Save to `Inbox/Meeting - [Meeting Title].md`

## Memory-Enhanced Features

### Attendee Prioritization
Uses Memory tags to prioritize prep depth:
- `leadership`, `customer` -> Deep prep
- `prospect`, `investor` -> Medium prep, pitch-ready
- `employee`, `team` -> Standard prep
- `consultant`, `supplier` -> Light prep

### Relationship-Aware Topics
Adjusts focus based on relationship:
- **Customer**: deliverables, blockers, value
- **Prospect**: capabilities, fit, next steps
- **Internal**: decisions, alignment, support needed
- **Investor**: traction, metrics, strategy

## Tips

1. **Just say "prep for my next meeting"** - Auto-detection via calendar
2. **Run prep 1-2 hours before meeting**
3. **Update Memory notes** - Better context = better prep
4. **Check timezone** - Calendar uses UTC, convert to local
5. **Record outcomes** - Update meeting notes during/after meeting
