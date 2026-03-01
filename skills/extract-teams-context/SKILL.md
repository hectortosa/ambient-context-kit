# Extract Teams Context Skill

> **Conditional**: This skill requires Microsoft Teams integration (via MS365) to be configured in `.claude/state/setup-config.json`.

Extract messages, participants, and action items from Microsoft Teams conversations.

## Purpose

This skill is invoked by workflows (`/eob`, `/today`, `/meeting-prep`) to gather Teams conversation context since a given timestamp. It returns structured data about:
- People mentioned in conversations (for Memory notes)
- Action items detected via pattern matching (for Tasks)
- Conversation summaries grouped by participant

## Prerequisites

1. **MS365 Authentication**: User must be logged into MS365 MCP
2. **Teams Memory Initialized**: `.claude/state/teams-memory.json` must exist
3. **Timestamp Provided**: Know when to start searching from

## Input Parameters

- `since_timestamp`: ISO 8601 timestamp
- `vault_memory_files`: List of existing Memory note filenames for cross-referencing

## Processing Steps

### Step 1: Load Teams Memory

Load `.claude/state/teams-memory.json` from vault root. Filter to only monitored channels (`monitor: true`).

If Teams Memory doesn't exist or has no monitored channels, return appropriate error.

### Step 2: Verify MS365 Authentication

Check authentication status before proceeding.

### Step 3: Fetch Direct Messages (DMs)

Get all chats, then fetch messages since timestamp for each chat.

### Step 4: Fetch Channel Messages

For each monitored channel, fetch messages since timestamp. Include channel context (purpose, tags, conversation types).

### Step 5: Extract Participants

For each message, identify sender and @mentions. Deduplicate by email.

### Step 6: Apply Pattern Matching for Action Items

Check messages against action item patterns (TODO, follow up, need to, can you, etc.). See `pattern-matching.md` for details.

### Step 7: Build Conversation Summaries

Group messages by participant with channel context.

### Step 8: Cross-Reference with Memory Notes

Check if participants already have Memory notes. Separate into toCreate and toUpdate lists.

### Step 9: Apply Smart Tagging

Use channel context (`defaultTags`) to infer tags for new Memory notes.

### Step 10: Prepare Structured Output

Return JSON with summary, memoryNotes (toCreate/toUpdate), tasks, and processedMessageIds.

## Output Format

```json
{
  "summary": {
    "directMessages": 5,
    "channelMessages": 12,
    "channelsScanned": ["hiring", "sales"],
    "timeRange": "Since 2026-01-12 09:00:00"
  },
  "memoryNotes": {
    "toCreate": [...],
    "toUpdate": [...]
  },
  "tasks": [...],
  "processedMessageIds": [...]
}
```

## Error Handling

- MS365 not authenticated: Return error with suggested action
- Teams Memory not initialized: Return error suggesting discovery
- No messages found: Return empty results

## Helper Functions

See supporting documentation:
- `pattern-matching.md` - Action item and date extraction patterns
- `teams-memory-guide.md` - Teams Memory structure and management
