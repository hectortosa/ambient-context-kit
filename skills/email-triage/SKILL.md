---
name: email-triage
description: Deep email analysis and intelligent categorization using Memory notes for context-aware prioritization and action recommendations
context: fork
agent: assistant
---

# Email Triage Workflow

> **Conditional**: This workflow requires email integration to be configured in `.claude/state/setup-config.json`.

Deep email analysis and intelligent categorization using Memory notes for context-aware prioritization and action recommendations.

## Overview

The email triage workflow helps you efficiently process email by:
1. Fetching and categorizing emails using Memory context
2. Identifying which emails need tasks vs. simple responses
3. Drafting response templates for common scenarios
4. Suggesting Memory notes for new important contacts
5. Linking emails to existing vault context
6. Proposing specific actions with reasoning

## When to Use

- Morning email review (part of `/today` or standalone)
- After being away (catch up on accumulated email)
- End of day cleanup
- When inbox feels overwhelming

## Workflow Steps

### Step 1: Fetch Emails

**Time Range Options**:
- Last 24 hours (default for daily triage)
- Last 2-3 days (after weekend)
- Last week (after vacation)

**Filter Options**:
- Unread only (default)
- All emails in timeframe
- Flagged/Important only

### Step 2: Cross-Reference with Memory

**For Each Email**:
1. Extract sender name and email address
2. Search Memory folder for matching person/company
3. If found: Load Memory note, read tags and relationship context
4. If not found: Mark as "Unknown sender", check domain match

**Memory Matching Strategy**:
1. Exact email match in Memory note
2. Sender name match (case-insensitive)
3. Domain match (e.g., @company.com -> known company)
4. Company name in signature
5. No match -> Unknown

### Step 3: Categorize Emails

**Primary Categories** (based on Memory tags):

1. **Leadership/Critical** (Priority 1) - From leadership roles. Response time: Same day
2. **Customer** (Priority 2) - From customers. Response time: Within 24 hours
3. **Prospect** (Priority 3) - From prospects. Response time: Within 48 hours
4. **Team** (Priority 4) - From team members. Response time: Within 1-2 days
5. **External/Partner** (Priority 5) - From suppliers, consultants, advisors
6. **Unknown** (Priority 6) - No Memory match. Triage manually
7. **Low Priority** (Priority 7) - Newsletters, notifications

**Secondary Signals**:
- Subject keywords: "urgent", "ASAP", "blocker", "critical"
- Importance flag: High
- Multiple recipients: Might be FYI
- Attachments: Might need review time

### Step 4: Analyze Email Intent

**Action Required**: Requests, questions, deadlines, blockers
**Response Required**: Direct questions, meeting requests, approvals
**FYI Only**: Updates, announcements, CC'd emails
**Automation/System**: Notifications, alerts, subscriptions

### Step 5: Recommend Actions

**Create Task**: Action needed, takes >5 minutes, has deadline
**Quick Response**: Simple question, <2 minutes, acknowledgment
**Delegate**: Better handled by someone else
**Archive/Mark Read**: FYI only, no action needed
**Create Memory Note**: New important contact

### Step 6: Draft Responses

Generate response templates for quick-response emails based on intent and Memory context.

### Step 7: Generate Task Files

For each "Create Task" email, generate a task file with:
- Email context (sender, date, preview)
- Action required description
- Related vault links (Memory notes, tasks, PM issues)
- Priority based on Memory tags + urgency

### Step 8: Suggest Memory Note Creation

Suggest Memory notes for:
- Important new contacts (customer, prospect, partner)
- Frequent senders (3+ emails) not in Memory
- Leadership at relevant companies

### Step 9: Present Triage Summary

Show comprehensive output organized by:
- Urgent actions required (with full context)
- Quick responses needed (with draft responses)
- Team updates (FYI)
- External/Low priority
- New contacts to add to Memory
- Summary statistics

### Step 10: Execute with Approval

Create approved task files, save response drafts, create Memory notes, optionally mark emails as read.

## Memory-Enhanced Intelligence

### Sender Prioritization Matrix

| Memory Tag | Priority | Response Time | Auto-Create Task |
|-----------|----------|--------------|------------------|
| leadership | Urgent | Same day | If action needed |
| customer | High | 24 hours | If request made |
| prospect | High | 48 hours | If meeting/demo |
| employee, team | Medium | 1-2 days | If blocking work |
| consultant, supplier | Medium | As needed | Rarely |
| candidate | Low | As appropriate | For interviews |
| Unknown | Review | Manual triage | Case by case |

## Integration with Other Workflows

### With `/today`
Morning routine includes quick email triage, urgent flagging, and task creation.

### With `/eob`
End of day: final email check, Memory note creation for new contacts.

### With Context Finder
Use context finder to check vault for related work when triaging.

## Triage Modes

**Quick Triage**: Categorize only, flag urgent items
**Standard Triage**: Full categorization, create urgent tasks, draft responses
**Deep Triage**: Full workflow including Memory notes and vault context linking

## Tips

1. **Triage daily** - Don't let email accumulate
2. **Trust Memory tags** - They drive smart prioritization
3. **Quick responses first** - Clear easy wins fast
4. **Create tasks liberally** - Better to capture than lose
5. **Update Memory regularly** - Better context = better triage
