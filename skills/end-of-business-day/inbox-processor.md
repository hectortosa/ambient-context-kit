# Inbox Processing Reference

Quick reference guide for the `/eob` workflow.

## File Structure

### Source
- **Daily note**: `Inbox/YYYY-MM-DD.md`

### Destinations
- **Tasks**: `Tasks/Task Name.md` (create file and link in Main.md)
- **Projects**: `Tasks/Project Name/Main.md` (long-term efforts)
- **Memory**: `Memory/Person or Company Name.md`
- **Research**: `Research/Topic Name.md`
- **Writing**: `Writing/Title.md` or `Writing/Platform/Title.md`
- **Archives**: `*/_archive/` (move completed items here)

## Hashtag Conversion Table

| Hashtag | Converts To | Goes To | Example |
|---------|-------------|---------|---------|
| #today | dueDate: today's date | Tasks/ | `dueDate: 2026-01-07` |
| #week | dueDate: Friday | Tasks/ | `dueDate: 2026-01-10` |
| #personal | tags: [personal] | Tasks/ | Individual task file |
| #work | tags: [work] | Tasks/ | Work-related tasks |
| #hiring | tags: [hiring] | Tasks/ | HR/recruiting tasks |
| #research | tags: [research] | Research/ | Research topics |
| #writing | tags: [writing] | Writing/ | Draft content |
| #linkedin | tags: [linkedin] | Writing/LinkedIn/ | LinkedIn-specific posts |
| #prospect | tags: [prospect] | Memory/ | Customer prospects |
| #customer | tags: [customer] | Memory/ | Customer information |
| #competitor | tags: [competitor] | Memory/ | Competitor research |
| #urgent | tags: [urgent] | Tasks/ | High-priority tasks |

## Destination Decision Tree

```
Is this an action item?
|- YES, has due date (#today or #week)
|  \- Create Tasks/[Name].md with dueDate
|     \- Add wiki link to Tasks/Main.md
|
|- YES, no due date
|  \- Create Tasks/[Name].md with tags only
|     \- Add wiki link to Tasks/Main.md (Ongoing section)
|
|- NO, is it reference info?
|  |- About a person/company?
|  |  \- Create Memory/[Name].md with tags
|  |
|  \- About a topic/learning?
|     \- Create Research/[Topic].md with tags
|
\- NO, is it draft content?
   \- Create Writing/[Title].md or Writing/Platform/[Title].md
```

## Processing Checklist

For each item in Inbox:

- [ ] Read item and extract hashtags
- [ ] Identify destination (Tasks, Memory, Research, Writing, Delete)
- [ ] Convert hashtags to frontmatter (time tags -> dueDate, category tags -> tags array)
- [ ] Create file with proper metadata
- [ ] For Tasks: Add wiki link to Tasks/Main.md
- [ ] Mark with `#processed` (daily notes) or `processed: true` (other files)
- [ ] Once fully processed, move file to `Inbox/_archive/`

## Common Patterns

### New Task (with due date)
```yaml
---
dueDate: YYYY-MM-DD
tags:
  - category
---

# Task Name

Description here.
```
Then add to `Tasks/Main.md`: `- [ ] [[Task Name]]`

### Memory Note
```yaml
---
tags:
  - relationship-type
  - context
---

# Company/Person Name

Notes and context.
```

### Research Item
```yaml
---
tags:
  - research
  - topic
---

# Research Topic

Findings and notes.
```
