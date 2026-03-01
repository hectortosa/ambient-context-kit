# Linear Sync Reference

> **Conditional**: This reference only applies if Linear is configured as the project management integration in `.claude/state/setup-config.json`.

Quick reference for converting Linear issues to task files in `/today` workflow.

## Linear Issue to Task File Mapping

### Linear Issue Fields

When fetching issues from Linear API via `list_issues`:

```json
{
  "id": "uuid",
  "identifier": "PROJ-123",
  "title": "Issue title",
  "description": "Full description...",
  "url": "https://linear.app/workspace/issue/PROJ-123/...",
  "status": "In Progress",
  "labels": [
    {"name": "infrastructure"},
    {"name": "azure"}
  ],
  "project": "Project Name",
  "projectId": "uuid",
  "team": "Team Name",
  "dueDate": null,
  "priority": 2,
  "estimate": 3,
  "createdAt": "2025-12-12T08:29:14.771Z",
  "updatedAt": "2025-12-12T08:29:14.771Z"
}
```

### Conversion Table

| Linear Field | Task YAML Field | Notes |
|---|---|---|
| `title` | Filename + H1 | Use title only, not ID |
| `identifier` | Content link | Create clickable link in task file |
| `url` | Content link | Full URL for clicking through to Linear |
| `description` | Content section | Under `## Description` |
| `project` | Content metadata | Show which project |
| `status` | Content metadata | Include current status |
| `labels` | YAML tags array | Convert to lowercase tag names |
| `dueDate` (if set) | YAML dueDate | Use ISO format (YYYY-MM-DD) |
| `dueDate` (if null) | YAML dueDate | Auto-assign to this Friday |

### Task File Template

**Location**: `Tasks/[Linear Title].md`

```yaml
---
dueDate: YYYY-MM-DD
tags:
  - linear
  - [label1]
  - [label2]
---

# [Linear Title]

[PROJ-123](https://linear.app/workspace/issue/PROJ-123/...)

**Project**: [Project Name]

**Status**: [Status]

## Description

[Full description from Linear]
```

## Label to Tag Conversion

1. Convert to lowercase
2. Replace spaces with hyphens
3. Always include `linear` tag for Linear-sourced tasks

## Status Synchronization

| Linear Status | Task Behavior |
|---|---|
| `In Progress` | Include in daily sync |
| `Todo` | Include in daily sync |
| `Done` | Don't sync, archive |
| `Backlog` | Don't sync |
| `Canceled` | Don't sync |

## Duplicate Detection

### Method 1: File Name Match
- Check if file with Linear title already exists in `Tasks/`

### Method 2: Linear Link in File
- Search for `[PROJ-XXX]` in task files

### Action on Duplicate
- Skip creation
- Check if existing file needs update (status, description)

## Due Date Assignment

### If Linear Has Due Date
Use Linear's due date exactly.

### If Linear Has No Due Date
Auto-assign to this Friday.

**Calculation**: Use bash `date` command to determine this Friday's date.

## Tasks/Main.md Integration

### Placement Rules
- **Due Today**: `dueDate` matches today's date
- **Due This Week**: `dueDate` between today and Friday
- **Ongoing**: No `dueDate` field

### Wiki-Link Format
```markdown
- [ ] [[Task Name]]
```

## Quality Checklist

- [ ] Filename matches Linear title exactly
- [ ] YAML frontmatter is valid
- [ ] `dueDate` is in `YYYY-MM-DD` format
- [ ] `linear` tag is included
- [ ] All Linear labels converted to lowercase tags
- [ ] Linear link is clickable
- [ ] Wiki-link added to Tasks/Main.md
