---
name: context-finder
description: Cross-system search and synthesis that gathers all information about a person, project, company, or topic from vault, project management, and email.
---

# Context Finder Workflow

Cross-system search and synthesis that gathers all information about a person, project, company, or topic from vault, project management tools, and email.

## Overview

The context finder workflow provides comprehensive insights by:
1. Searching simultaneously across vault and configured integrations
2. Loading Memory context for people and companies
3. Finding all related tasks, issues, emails, and notes
4. Building timeline of interactions and activities
5. Identifying current status and next steps
6. Generating executive summary with actionable insights

## When to Use

- "Tell me everything about [person/company/project]"
- "What's the status of [project] across all sources?"
- "What did I discuss with [person] recently?"
- Before important meetings or decisions
- When catching up after time away

## Query Types

### Person Query
- Load Memory note
- Find all tasks mentioning person
- Find PM issues assigned to or mentioning person (if PM configured)
- Find all emails from/to person (if email configured)

### Company Query
- Load Memory note and all contacts
- Find all related tasks
- Find PM issues in company projects (if PM configured)
- Find all emails mentioning company (if email configured)
- Fetch CRM data (if CRM configured)

### Project Query
- Find project folder or main task
- Find all related tasks and subtasks
- Find PM issues in project (if PM configured)
- Find emails discussing project (if email configured)

### Topic Query
- Search vault for topic mentions
- Find tasks tagged with topic
- Find PM issues about topic (if PM configured)

## Workflow Steps

### Step 1: Parse and Classify Query

Identify query type (Person, Company, Project, Topic), extract key terms, time constraints, scope modifiers.

### Step 2: Load Memory Context

Search Memory/ for relevant notes. Load tags, relationship type, contacts, history.

### Step 3: Search Vault

Search all sections: Tasks/, Memory/, Research/, Writing/, Inbox/

### Step 4: Search PM Tool

> **Conditional**: Only if project management integration is configured.

Query PM API for issues related to the entity.

### Step 5: Search Emails

> **Conditional**: Only if email integration is configured.

Query email API for threads related to the entity. Categorize by recency and extract key information (decisions, commitments, open questions).

### Step 6: Search Calendar

> **Conditional**: Only if calendar integration is configured.

Find past and upcoming meetings related to the entity.

### Step 7: Build Timeline

Create chronological view of all activities across all sources.

### Step 8: Analyze Current Status

Synthesize: active work, blockers, relationships, momentum.

### Step 9: Identify Next Actions

Organize by immediacy: Today, This Week, This Month.

### Step 10: Generate Executive Summary

Produce comprehensive report with:
- Executive summary and key metrics
- Memory context (people, companies, relationships)
- Active work (tasks, PM issues)
- Communication history (emails, meetings)
- Timeline view
- Current status analysis
- Next actions prioritized
- Insights and recommendations

## Memory-Enhanced Features

### Person-Centric Queries
Uses Memory tags to understand context:
- **Leadership**: Focus on strategic decisions
- **Team**: Focus on collaboration
- **External**: Focus on relationship health and deliverables

### Company Intelligence
Automatically loads all contacts, industry context, relationship history, current projects.

### Relationship Scoring
Evaluates health based on communication frequency, response times, meeting cadence, task completion rates.

## Query Modes

**Quick Context**: Memory context + 7-day activity + status summary
**Standard Context**: Full workflow + 30-day activity + comprehensive summary
**Deep Context**: Full history + pattern identification + strategic recommendations

## Tips

1. **Be specific**: "Everything about [project] deployment" vs just "[project]"
2. **Time-bound when needed**: "[topic] activity in last month"
3. **Save important reports**: Store to Research/ for reference
4. **Update Memory**: Better Memory = better context finding
5. **Run before key meetings**: Always be prepared
