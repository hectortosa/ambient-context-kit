# Teams Memory Guide

> **Conditional**: This guide applies when Microsoft Teams integration is configured.

Comprehensive guide to Teams Memory structure and management.

## Overview

Teams Memory is the Teams Agent's persistent context that contains semantic understanding of your Teams organization. It enables intelligent message processing by knowing:
- What each channel is used for
- What types of conversations happen where
- What tags to apply to content from each channel
- Which channels to monitor

**Location**: `.claude/state/teams-memory.json`

## Structure

```json
{
  "teams": [
    {
      "teamId": "string (MS365 team ID)",
      "teamName": "string (human-readable)",
      "purpose": "string (what this team is for)",
      "channels": [
        {
          "channelId": "string (MS365 channel ID)",
          "channelName": "string (human-readable)",
          "purpose": "string (what this channel is for)",
          "conversationTypes": ["array", "of", "conversation", "topics"],
          "defaultTags": ["array", "of", "tags"],
          "monitor": boolean
        }
      ]
    }
  ],
  "lastUpdated": "ISO 8601 timestamp"
}
```

## How Teams Memory is Used

### 1. Channel Selection
Only channels with `monitor: true` are scanned.

### 2. Smart Tagging
When a person is mentioned, apply channel's `defaultTags` to their Memory note.

### 3. Context Understanding
Use `purpose` and `conversationTypes` to understand conversation context.

## Initial Discovery

When Teams Memory is empty, discover your Teams structure:

1. **Discover Teams**: List all joined teams via MS365 API
2. **Discover Channels**: List channels for each team
3. **User Input**: Present structure and ask user to describe each channel's purpose, conversation types, and monitoring preference
4. **Generate Memory**: Create Teams Memory based on user input

## Updating Teams Memory

### Adding a New Channel
Add entry with channelId, channelName, purpose, conversationTypes, defaultTags, and monitor flag.

### Disabling Monitoring
Change `monitor` to `false`.

### Refresh Discovery
Re-run discovery to update with new teams/channels while preserving existing purpose/tags.

## Best Practices

### 1. Descriptive Purposes
Good: "Candidate discussions, interview scheduling, recruitment pipeline tracking"
Bad: "Hiring stuff"

### 2. Comprehensive Conversation Types
Include all relevant types for better context matching.

### 3. Appropriate Tags
Use tags that match your Memory note taxonomy.

### 4. Selective Monitoring
Only monitor channels with actionable content (e.g., hiring, sales). Skip noise channels (general, random).

### 5. Regular Updates
Update when channels are created, purposes change, or conversation patterns shift.

## Troubleshooting

### Memory File Not Found
Create empty template: `{"teams": [], "lastUpdated": null}` and run discovery.

### Invalid JSON
Validate with `jq` and fix syntax.

### No Channels Monitored
Ensure at least one channel has `monitor: true`.

## Schema Validation

All fields are required:
- `teamId`, `teamName`, `purpose`: string
- `channels`: array of channel objects
- Each channel: `channelId`, `channelName`, `purpose` (string), `conversationTypes`, `defaultTags` (arrays), `monitor` (boolean)
