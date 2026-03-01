# Pattern Matching Reference

Pattern matching rules for detecting action items and due dates in Teams messages.

## Action Item Patterns

### Primary Patterns (clear action items)

| Pattern | Regex | Examples |
|---------|-------|----------|
| **TODO** | `/\b(TODO|To do|To-do)\b/i` | "TODO: Review the contract" |
| **Action Item** | `/\bAction item\b/i` | "Action item: send proposal" |
| **Follow Up** | `/\b(Follow up|Following up|Follow-up)\b/i` | "Need to follow up with them" |

### Request Patterns

| Pattern | Regex | Examples |
|---------|-------|----------|
| **Can You** | `/\b(Can you|Could you|Would you|Will you)\b/i` | "Can you send the report?" |
| **Please** | `/\bPlease\b/i` | "Please update the document" |
| **Need To** | `/\b(Need to|needs to|Needed to)\b/i` | "We need to discuss this" |

### Commitment Patterns

| Pattern | Regex | Examples |
|---------|-------|----------|
| **I'll/I Will** | `/\b(I'll|I will|I'm going to)\b/i` | "I'll send it tomorrow" |
| **Let's** | `/\b(Let's|Let me|Let us)\b/i` | "Let's schedule a meeting" |

### Reminder Patterns

| Pattern | Regex | Examples |
|---------|-------|----------|
| **Reminder** | `/\b(Reminder|Don't forget|Make sure|Remember to)\b/i` | "Reminder to send the invoice" |

### Scheduling Patterns

| Pattern | Regex | Examples |
|---------|-------|----------|
| **Schedule** | `/\b(Schedule|Set up|Arrange|Book)\b/i` | "Schedule a call" |

### Delivery Patterns

| Pattern | Regex | Examples |
|---------|-------|----------|
| **Send/Share** | `/\b(Send|Share|Provide|Give|Forward)\b/i` | "Send the document" |

## Date Extraction Patterns

### Explicit Dates

| Pattern | Result | Examples |
|---------|--------|----------|
| **Today** | Current date | "Review this today" |
| **Tomorrow** | Current date + 1 | "I'll do it tomorrow" |

### Relative Week References

| Pattern | Result | Examples |
|---------|--------|----------|
| **This week** | This Friday | "Finish this week" |
| **Next week** | Next Friday | "Let's discuss next week" |
| **End of week** | This Friday | "Complete by end of week" |

### Specific Date Formats

| Pattern | Regex | Examples |
|---------|-------|----------|
| **ISO Date** | `/\b\d{4}-\d{2}-\d{2}\b/` | "2026-01-15" |
| **US Format** | `/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/` | "1/15/2026" |
| **European Format** | `/\b\d{1,2}\.\d{1,2}\.\d{4}\b/` | "15.01.2026" |

## Task Title Extraction Rules

1. **Action verb first**: Extract sentence starting with action verb
2. **Remove pattern marker**: Strip matched pattern from title
3. **Sentence boundaries**: Stop at `. ! ?`
4. **Truncate**: Max 100 characters
5. **Clean up**: Remove extra whitespace and punctuation

## Default Due Dates

| Urgency | Default | Rationale |
|---------|---------|-----------|
| Urgent (ASAP) | today | Immediate attention |
| No date mentioned | this Friday | Standard weekly planning |
| "Soon" or "sometime" | this Friday | Better to have a date |

## False Positives to Avoid

| False Positive | How to Filter |
|----------------|---------------|
| "You can find it here..." | Check if followed by "you" |
| "Let's see how it goes" | Check if followed by action verb |
| "I need to think about it" | Require specific action object |
| "Can you believe that?" | Check if rhetorical question |
