# Task Formatting Reference

Detailed reference for creating and formatting task files in the `/eob` workflow.

## Task File Structure

Every task file should follow this structure:

```yaml
---
dueDate: YYYY-MM-DD  (optional, omit if no due date)
tags:
  - category1
  - category2
---

# Task Title

Task description and any relevant context.
```

## YAML Frontmatter Format

### Required Elements
- **File location**: `Tasks/[Task Name].md`
- **File naming**: Use title case with spaces (e.g., `Update Tax Card.md`)

### Frontmatter Properties

#### `dueDate` (optional)
- Format: `YYYY-MM-DD` (ISO 8601)
- Only include if task has a deadline
- Converted from `#today` or `#week` hashtags

#### `tags` (recommended)
- Format: YAML array of strings
- All tags should be lowercase
- Multiple tags allowed and encouraged
- Converted from non-date hashtags

## Reference in Tasks/Main.md

After creating a task file, add it to `Tasks/Main.md` in the appropriate section:

```markdown
## Due Today
- [ ] [[Task Name]]

## Due This Week
- [ ] [[Another Task]]

## Ongoing
- [[Recurring Task]]
```

## Special Cases

### Subtasks of a Project
For larger efforts with multiple subtasks, create a folder:
```
Tasks/[Project Name]/
|- Main.md
|- Subtask 1.md
\- Subtask 2.md
```

### Tags Best Practices

**Common tag categories**:
- **Context**: work, personal, research, writing
- **Priority**: urgent, high, normal, low
- **Type**: hiring, meeting, analysis, documentation
- **Status**: recurring, blocked, waiting-for

## Date Formatting

All dates use ISO format: `YYYY-MM-DD`

### Hashtag to Date Conversion

| Hashtag | Calculation | Example |
|---------|-------------|---------|
| #today | Today's date | 2026-01-07 |
| #week | This/next Friday | 2026-01-10 |

**Rules for `#week`**:
- If today is before Friday: use this Friday
- If today is Friday or later: use next Friday

## Validation Checklist

When creating a task file, verify:

- [ ] File is in `Tasks/` directory
- [ ] Filename uses Title Case with spaces
- [ ] Frontmatter section is valid YAML
- [ ] `dueDate` (if included) is in `YYYY-MM-DD` format
- [ ] `tags` is a proper YAML array
- [ ] Task title (H1) matches the filename concept
- [ ] Description is clear and actionable
- [ ] Task is referenced in `Tasks/Main.md` with `[[Task Name]]`
