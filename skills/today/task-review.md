# Task Review and Prioritization Guide

Guide for the `/today` workflow to review existing tasks and set priorities.

## Task Review Process

### 1. Categorize by Status

**Has Due Date?**
- Yes: Due Today, Due This Week, or Future
- No: Unscheduled/Ongoing

**Is Complete?**
- Yes: Archive to `Tasks/_archive/`
- No: Keep in active list

**Is Overdue?**
- Yes: Highlight to user, ask about reschedule
- No: Keep as-is

### 2. Identify Missing Due Dates

Scan task files and identify those without `dueDate` in frontmatter.

**Action**: Suggest setting a due date or moving to "Ongoing" section.

### 3. Review Task Descriptions

Quick check of task file content:
- Is description clear?
- Are wiki-links to Memory/Resources working?
- Does it need follow-up actions?

## Due Date Priority Matrix

### Today
**Criteria**: Blocking other work, customer-facing deadline, critical/urgent, time-sensitive
**Action**: Suggest adding to "Due Today" section

### This Week (By Friday)
**Criteria**: Important but not urgent, part of current project, can be done alongside other work
**Action**: Auto-assign to Friday

### Next Week or Later
**Criteria**: Not urgent, can be deferred, planning-phase work, lower priority
**Action**: Suggest later date or leave in Backlog

### Ongoing (No Due Date)
**Criteria**: Recurring work, background tasks, always-active responsibilities
**Action**: Keep without `dueDate`, add to "Ongoing" section in Main.md

## Handling Overdue Tasks

1. **Show to user**: "Task X was due on [date] but is still open"
2. **Ask**: "Should this be rescheduled or archived?"
3. **Options**: Reschedule, Archive, or Keep as-is
4. **Don't auto-modify** - Let user decide

## Format and Consistency Checks

### Date Format Issues
**Problem**: Inconsistent date formats
**Solution**: Standardize to `YYYY-MM-DD`

### Missing Wiki-Links
**Problem**: Plain text references instead of `[[wiki-links]]` in Main.md
**Solution**: Convert to wiki-link format

### Missing Frontmatter
**Problem**: Task file has no YAML frontmatter
**Solution**: Add `---`, `tags: []`, and optionally `dueDate`

## Decision Tree

```
Found task file
|- Has dueDate?
|  |- Yes
|  |  |- Is dueDate in past?
|  |  |  |- Yes -> Highlight as overdue, ask user
|  |  |  \- No -> Keep at current priority
|  \- No
|     |- Is blocking? -> Suggest today
|     |- Is important? -> Suggest this week (Friday)
|     \- Is recurring? -> Add to Ongoing
|- Is completed [x]?
|  |- Yes -> Suggest archive to _archive/
|  \- No -> Keep in active section
\- Date format correct?
   |- YYYY-MM-DD -> Good
   \- Other format -> Flag for conversion
```

## Related Workflows

- **`/eob`** (End of Business Day): Process Inbox -> create tasks
- **`/today`** (Start of Business Day): Sync PM tool -> review tasks
- **`/eow`** (End of Week): Archive completed tasks
