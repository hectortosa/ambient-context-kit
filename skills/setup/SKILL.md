---
name: setup
description: Interactive setup wizard to configure ambient-context vault, integrations, and preferences. Run this after cloning the repository to personalize your installation.
context: fork
---

# Setup (`/setup`) Wizard

Interactive setup wizard that walks you through configuring your ambient-context installation. This creates your vault, configures integrations, and personalizes the system for your workflow.

## Overview

The `/setup` wizard guides you through:

1. **Context type** - Personal or Professional?
2. **Vault location** - Where to create your vault
3. **Timezone** - Your local timezone for calendar and date operations
4. **Integrations** - Email, Calendar, Messaging, CRM, Project Management (all optional)
5. **MCP Server** - Remote access configuration
6. **Search** - Indexed search setup
7. **Plan + Execute** - Generate and execute implementation plan

## Prerequisites

- Claude Code installed and working
- Git installed
- Node.js/Bun installed (for MCP server)

## Wizard Flow

### Step 1: Context Type

Ask the user what type of setup they want:

```
What kind of ambient context are you setting up?

1. Personal - Simpler setup with vault and core workflows only
   - Daily capture and organization
   - Task management
   - Research and writing
   - No business integrations needed

2. Professional - Full setup with optional business integrations
   - Everything in Personal, plus:
   - Email integration
   - Calendar integration
   - Messaging platform (Teams, Slack, etc.)
   - CRM integration
   - Project management tool
```

**Store choice in config**: `contextType: "personal" | "professional"`

If Personal: Skip to Step 2, then skip integration questions (Step 4), go directly to MCP Server (Step 5).
If Professional: Continue through all steps.

### Step 2: Vault Location

Ask where to create the vault:

```
Where should your vault be created?

1. ~/ambient-context-vault/ (Recommended)
   - Default location, easy to find

2. Custom location
   - You specify the path

Tip: If you use Obsidian, you can open this folder as a vault for
manual browsing. Obsidian is recommended but not required.
```

**Store choice in config**: `vaultPath: "/path/to/vault"`

### Step 3: Timezone

Ask for the user's timezone:

```
What timezone are you in?

This is used for:
- Calendar event display (converting UTC to local time)
- Date calculations (determining "today", "this Friday", etc.)
- Email timestamp display

Examples: America/New_York, Europe/London, Asia/Tokyo, Australia/Sydney

Enter your timezone (IANA format):
```

**Validation**: Verify timezone is valid using `date` command or timezone database.

**Store choice in config**: `timezone: "America/New_York"`

### Step 4: Integrations (Professional Only)

For each integration type, follow this pattern:

#### 4a. Email Integration

```
Do you want email integration?

This enables:
- Email triage and categorization
- Automatic task creation from urgent emails
- Self-sent vault capture emails
- Email context in meeting prep

1. Yes
2. No (skip)
```

If Yes:

```
Which email provider?

1. Office 365 (Built-in support)
   - Uses MS365 MCP server
   - Supports email, calendar, and Teams in one integration

2. Gmail
   - Claude will help you set up Gmail MCP integration

3. Other
   - Claude will help you configure your provider
```

If Office 365: Mark as built-in, configure MS365 MCP.
If other: Note the choice, Claude helps configure during execution phase.

**Store in config**:
```json
{
  "integrations": {
    "email": {
      "enabled": true,
      "provider": "office365",
      "builtin": true
    }
  }
}
```

#### 4b. Calendar Integration

```
Do you want calendar integration?

This enables:
- Today's schedule in morning workflow
- Meeting prep with attendee context
- Focus time identification
- Back-to-back meeting warnings

1. Yes
2. No (skip)
```

If Yes and email is already Office 365: Auto-enable (same MCP server).

If Yes and email is not Office 365:
```
Which calendar provider?

1. Office 365 (Built-in support)
2. Google Calendar
3. Other
```

**Store in config**: `integrations.calendar`

#### 4c. Messaging Integration

```
Do you want messaging platform integration?

This enables:
- Extract action items from chat messages
- Track conversations with customers/prospects
- Auto-create Memory notes from discussions
- Channel-aware smart tagging

1. Yes
2. No (skip)
```

If Yes:
```
Which messaging platform?

1. Microsoft Teams (Built-in support via MS365)
   - Channel monitoring
   - DM extraction
   - Smart tagging based on channel context

2. Slack
   - Claude will help you set up Slack MCP integration

3. Other
   - Claude will help you configure your platform
```

**Store in config**: `integrations.messaging`

#### 4d. CRM Integration (Professional Only)

```
Do you want CRM integration?

This enables:
- Company and deal tracking in vault
- Pipeline status in meeting prep
- Automatic Memory note updates from CRM
- Deal stage change notifications

1. Yes
2. No (skip)
```

If Yes:
```
Which CRM?

1. Attio (Built-in support)
   - Company search
   - Deal tracking
   - Notes sync

2. Salesforce
   - Claude will help you set up Salesforce integration

3. HubSpot
   - Claude will help you set up HubSpot integration

4. Other
   - Claude will help you configure your CRM
```

**Store in config**: `integrations.crm`

#### 4e. Project Management Integration (Professional Only)

```
Do you want project management tool integration?

This enables:
- Sync tickets/issues to vault tasks
- Morning workflow includes PM sync
- Automatic task file creation
- Status tracking in vault

1. Yes
2. No (skip)
```

If Yes:
```
Which project management tool?

1. Linear (Built-in support)
   - Issue sync with "In Progress" and "Todo"
   - Label to tag conversion
   - Project tracking

2. Jira
   - Claude will help you set up Jira integration

3. GitHub Issues
   - Claude will help you set up GitHub integration

4. Other
   - Claude will help you configure your PM tool
```

**Store in config**: `integrations.projectManagement`

### Step 5: MCP Server

```
Do you want to enable remote vault access via MCP server?

This allows other AI tools (Claude Desktop, Cursor, iOS Shortcuts,
voice assistants) to interact with your vault remotely.
It also serves a web UI for browsing your vault from any browser.

1. Tailscale (Recommended)
   - Access from any device on your Tailscale network
   - Zero-config security -- network-level encryption, no passwords or tokens
   - Works from phone, laptop, desktop -- anywhere on your tailnet
   - Also includes local access on this machine
   - Free for personal use: https://tailscale.com

2. Local only (port 9000)
   - Access from this machine only
   - No authentication needed

3. Custom
   - Claude will help you configure OAuth or API key authentication

4. Skip
   - Don't set up MCP server now
```

**Store in config**: `mcpServer`

#### Step 5b: Auto-start (if MCP server enabled)

Only ask this if the user chose Tailscale, Local, or Custom (not Skip):

```
Would you like the MCP server to start automatically at login?

1. Yes (Recommended) - Create a launchd service
   - Server starts automatically when you log in
   - Runs in background, restarts on failure
   - Managed via launchctl

2. No - Start manually
   - Run: cd mcp-server && ./start.sh
```

If Yes: During execution phase, create a LaunchAgent plist at
`~/Library/LaunchAgents/com.ambient-context.mcp-server.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ambient-context.mcp-server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/bun</string>
        <string>run</string>
        <string>src/index.ts</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/ambient-context-kit/mcp-server</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/ambient-context-mcp.out.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ambient-context-mcp.err.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
    </dict>
</dict>
</plist>
```

Replace `/path/to/bun` with the actual bun path (use `which bun`).
Replace `/path/to/ambient-context-kit/mcp-server` with the actual mcp-server directory.

Then load it:
```bash
launchctl load ~/Library/LaunchAgents/com.ambient-context.mcp-server.plist
```

**Store in config**: `mcpServer.autoStart: true | false`

### Step 6: Search

```
Do you want indexed search for your vault?

1. Yes - Install qmd for fast indexed search
   - Creates searchable index of all vault content
   - Enables web UI for browsing
   - Requires qmd installation

2. No - Use basic file search
   - Slower but works without additional tools
   - Uses grep/glob for searching
```

**Store in config**: `search`

### Step 7: Plan + Execute

After collecting all preferences, generate an implementation plan:

```
## Setup Plan

Based on your choices:
- Context: Professional
- Vault: ~/ambient-context-vault/
- Timezone: America/New_York
- Email: Office 365 (built-in)
- Calendar: Office 365 (built-in)
- Messaging: Microsoft Teams (built-in)
- CRM: Attio (built-in)
- PM: Linear (built-in)
- MCP Server: Tailscale
- Search: qmd

### Steps to Execute:

1. Copy vault template to ~/ambient-context-vault/
2. Update CLAUDE.md with vault path and timezone
3. Configure MS365 MCP server (email + calendar + Teams)
4. Configure Attio MCP integration
5. Configure Linear MCP integration
6. Set up MCP server with Tailscale
7. Install qmd and create search index
8. Initialize git repository
9. Generate initial TOC
10. Run smoke test

Proceed with this plan? [Yes / Modify / Cancel]
```

### Execution Phase

Upon approval, spawn an agent team to execute:

1. **Copy vault template** to chosen location
   - Create all directories (Inbox, Memory, Tasks, Research, Writing with _archive subdirs)
   - Copy template files (daily_note.md, meeting_notes.md, profile.md)
   - Create Tasks/Main.md with empty sections

2. **Save setup config** to `.claude/state/setup-config.json`
   ```json
   {
     "contextType": "professional",
     "vaultPath": "/Users/username/ambient-context-vault",
     "timezone": "America/New_York",
     "integrations": {
       "email": { "enabled": true, "provider": "office365", "builtin": true },
       "calendar": { "enabled": true, "provider": "office365", "builtin": true },
       "messaging": { "enabled": true, "provider": "teams", "builtin": true },
       "crm": { "enabled": true, "provider": "attio", "builtin": true },
       "projectManagement": { "enabled": true, "provider": "linear", "builtin": true }
     },
     "mcpServer": { "enabled": true, "mode": "tailscale", "port": 9000, "autoStart": true },
     "search": { "enabled": true, "provider": "qmd" },
     "setupCompleted": "2026-01-15T10:00:00Z"
   }
   ```

3. **Update CLAUDE.md** paths and timezone references

4. **Configure integrations** based on choices:
   - For built-in integrations: Set up env files, MCP configs
   - For non-built-in: Guide user through manual setup

5. **Install MCP server dependencies** (`npm install` or `bun install`)

6. **Set up search** if chosen (install qmd, create collection)

7. **Initialize git repo** in vault directory

8. **Generate initial TOC** (`_TOC.md`)

9. **Run verification**:
   - Verify vault structure is correct
   - Test `/today` (with available integrations)
   - Confirm MCP server starts (if configured)

### Post-Setup Summary

Display a comprehensive quick-start guide. Adapt the content based on the user's actual choices (show/hide Tailscale sections, auto-start status, etc.):

```
## Setup Complete!

Your ambient-context vault is ready at {vaultPath}.

---

### Your Vault

Your vault is a folder of markdown files organized into sections:

| Folder     | Purpose                                        |
|------------|------------------------------------------------|
| `Inbox/`   | Quick captures -- notes, links, tasks          |
| `Memory/`  | People, companies, topics (your knowledge base)|
| `Tasks/`   | Task hub + project folders                     |
| `Research/`| Ideas, reading lists, things to explore        |
| `Writing/` | Drafts and published content                   |

**Obsidian** (optional): Open {vaultPath} as an Obsidian vault for
visual browsing, graph view, and manual editing. Download at https://obsidian.md

---

### Daily Workflow

Your day follows three rhythms:

**Morning** -- Run `/today` in Claude Code
- Syncs tickets from your project management tool
- Checks email and calendar
- Reviews pending tasks
- Gives you a morning briefing

**Throughout the day** -- Capture to `Inbox/`
- Add notes, links, tasks to `Inbox/YYYY-MM-DD.md`
- Use hashtags: `#today` (due today), `#week` (due Friday), `#project-name`
- Or use the MCP tool `add_quick_note` from any AI assistant

**End of day** -- Run `/eob` in Claude Code
- Processes everything in Inbox/
- Converts hashtags to proper metadata
- Creates task files, memory notes, research entries
- Archives processed items

**Friday** -- Run `/eow` in Claude Code
- Archives completed tasks
- Reviews uncompleted items
- Prepares for next week

---

### Web UI

Your vault has a web interface for browsing from any browser:

- **Local**: http://localhost:9000
{IF_TAILSCALE}
- **From other devices**: http://{machine-name}:9000 (via Tailscale MagicDNS)

  MagicDNS lets you access your vault using your machine's name instead of
  an IP address. If MagicDNS is not enabled yet, turn it on in the Tailscale
  admin console: https://login.tailscale.com/admin/dns

  Example: If your machine is called "macbook", access the vault at
  http://macbook:9000 from any device on your tailnet.
{/IF_TAILSCALE}

The web UI provides a clean, read-only view of all vault sections with
full-text search.

---

### MCP Remote Access

Your vault is accessible as an MCP server, so other AI tools can read
and write to it.

**Endpoint**: http://{host}:9000/mcp (Streamable HTTP)

**Connect from Claude Desktop or Cursor**:
Add this to your MCP configuration:
```json
{
  "mcpServers": {
    "ambient-context": {
      "url": "http://{host}:9000/mcp"
    }
  }
}
```
{IF_TAILSCALE}
Replace `{host}` with your machine's Tailscale MagicDNS name (e.g., `macbook`)
for cross-device access, or `localhost` for same-machine access.
{/IF_TAILSCALE}

**Available tools**: `list_tasks`, `add_quick_note`, `find_context`,
`get_memory`, `update_task`, `prepare_meeting`, and more.

This means you can add notes to your vault from your phone, iPad, or any
device running an MCP-compatible AI assistant.

---
{IF_AUTOSTART}
### Auto-Start

The MCP server is configured to start automatically at login via launchd.

- **Check status**: `launchctl list | grep ambient-context`
- **View logs**: `tail -f /tmp/ambient-context-mcp.out.log`
- **Stop**: `launchctl unload ~/Library/LaunchAgents/com.ambient-context.mcp-server.plist`
- **Start**: `launchctl load ~/Library/LaunchAgents/com.ambient-context.mcp-server.plist`
{/IF_AUTOSTART}
{IF_NO_AUTOSTART}
### Starting the MCP Server

Start the server manually when you need remote access or the web UI:

```bash
cd {mcp-server-path} && ./start.sh
```
{/IF_NO_AUTOSTART}
---

### What's Next

1. **Run `/today`** right now to see your first morning briefing
2. **Add a quick note** to `Inbox/` -- try capturing something
3. **Open the web UI** at http://localhost:9000 to see your vault
4. **Add Memory notes** for key people and companies you work with
5. **Connect Claude Desktop** to your MCP server for mobile access

### Configuration

Stored at `.claude/state/setup-config.json`. Re-run `/setup` anytime to change settings.
```

**Template variables**: Replace `{vaultPath}`, `{host}`, `{machine-name}`, `{mcp-server-path}`
with actual values from the user's config. Show/hide `{IF_TAILSCALE}`, `{IF_AUTOSTART}`,
`{IF_NO_AUTOSTART}` sections based on the user's choices.

## Config Schema

The setup config file (`.claude/state/setup-config.json`) is the central configuration that all workflows reference:

```typescript
interface SetupConfig {
  contextType: "personal" | "professional";
  vaultPath: string;
  timezone: string;  // IANA timezone (e.g., "America/New_York")
  integrations: {
    email?: {
      enabled: boolean;
      provider: string;  // "office365", "gmail", etc.
      builtin: boolean;
    };
    calendar?: {
      enabled: boolean;
      provider: string;
      builtin: boolean;
    };
    messaging?: {
      enabled: boolean;
      provider: string;  // "teams", "slack", etc.
      builtin: boolean;
    };
    crm?: {
      enabled: boolean;
      provider: string;  // "attio", "salesforce", "hubspot", etc.
      builtin: boolean;
    };
    projectManagement?: {
      enabled: boolean;
      provider: string;  // "linear", "jira", "github", etc.
      builtin: boolean;
    };
  };
  mcpServer?: {
    enabled: boolean;
    mode: "local" | "tailscale" | "custom";
    port: number;
    autoStart: boolean;  // launchctl auto-start at login
  };
  search?: {
    enabled: boolean;
    provider: "qmd" | "basic";
  };
  setupCompleted: string;  // ISO 8601 timestamp
}
```

## How Workflows Use Config

All workflows should check `.claude/state/setup-config.json` at startup:

```javascript
// Read config
const config = JSON.parse(Read(".claude/state/setup-config.json"));

// Check timezone
const userTimezone = config.timezone;  // "America/New_York"

// Check if email is configured
if (config.integrations?.email?.enabled) {
  // Run email-related steps
}

// Check if PM tool is configured
if (config.integrations?.projectManagement?.enabled) {
  if (config.integrations.projectManagement.provider === "linear") {
    // Use Linear API
  }
}

// Check if CRM is configured
if (config.integrations?.crm?.enabled) {
  // Run CRM-related steps
}
```

## Built-in vs Custom Integrations

**Built-in integrations** ship with ambient-context and are pre-configured:
- **Office 365**: Email, Calendar, Teams (via MS365 MCP)
- **Attio**: CRM
- **Linear**: Project Management

**Custom integrations** require user setup:
- Claude helps configure MCP servers or API connections
- User provides credentials and connection details
- Config stores the provider choice for workflow conditional logic

## Re-running Setup

Users can run `/setup` again to:
- Change timezone
- Add or remove integrations
- Modify vault location
- Update MCP server configuration

The wizard detects existing config and offers to modify rather than recreate:

```
Existing configuration detected.

What would you like to change?
1. Add/remove integrations
2. Change timezone
3. Reconfigure MCP server
4. Full reset (start from scratch)
```
