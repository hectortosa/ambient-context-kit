# ambient-context-kit

A Claude Code plugin for ambient personal and professional context management.

ambient-context-kit turns a folder of markdown files into a structured knowledge management system powered by Claude Code workflows. It captures your daily work, organizes it automatically, and builds persistent context about people, companies, projects, and topics -- so every Claude session starts with full awareness of your world.

## Features

**Vault structure** -- Organized sections for Inbox (daily captures), Memory (people and companies), Tasks (with central hub), Research, and Writing. All markdown, all portable.

**Daily workflows** -- Morning startup (`/today`), end-of-day processing (`/eob`), and weekly cleanup (`/eow`) keep your vault organized without manual effort.

**Memory system** -- Build a persistent knowledge base about people, companies, and topics. Workflows use Memory notes to prioritize emails, prepare for meetings, and add context to tasks.

**Meeting prep** -- Automatically gather context about attendees, related tasks, CRM data, and email history before meetings.

**Cross-system search** -- `/context-finder` synthesizes information about any person, project, or topic across your vault and connected tools.

**MCP server** -- Access your vault remotely from Claude Desktop, Cursor, iOS Shortcuts, voice assistants, or any MCP-compatible tool. Includes a web UI for browsing.

**Optional integrations** -- Connect your existing tools:

| Integration | Built-in | Also supports |
|------------|----------|---------------|
| Email | Office 365 | Gmail, others |
| Calendar | Office 365 | Google Calendar, others |
| Messaging | Microsoft Teams | Slack, others |
| CRM | Attio | Salesforce, HubSpot, others |
| Project Management | Linear | Jira, GitHub Issues, others |

Built-in integrations are pre-configured. For others, Claude Code helps you set them up during `/setup`.

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/hectortosa/ambient-context-kit.git
   cd ambient-context-kit
   ```

2. **Open in Claude Code**
   ```bash
   claude
   ```

3. **Run setup**
   ```
   /setup
   ```

   The wizard walks you through:
   - Personal or professional context
   - Vault location and timezone
   - Integration choices (email, calendar, CRM, PM)
   - MCP server configuration with [Tailscale](https://tailscale.com) (recommended)
   - Optional auto-start at login via `launchctl`
   - Search setup

4. **Start using it**
   - `/today` -- morning startup
   - Add captures to `Inbox/` throughout the day
   - `/eob` -- process end-of-day
   - `/eow` -- weekly cleanup (Friday)

## Architecture

```
ambient-context-kit/
├── CLAUDE.md              # Instructions for Claude Code
├── vault/                 # Template vault (copied during /setup)
│   ├── Inbox/             # Daily captures
│   ├── Memory/            # People, companies, topics
│   ├── Research/          # Ideas and reading lists
│   ├── Tasks/             # Task management
│   └── Writing/           # Drafts and published content
│
├── skills/                # Workflow definitions
│   ├── setup/             # Interactive setup wizard
│   ├── today/             # Morning startup
│   ├── end-of-business-day/  # EOD processing
│   ├── end-of-week/       # Weekly cleanup
│   ├── meeting-prep/      # Meeting preparation
│   ├── context-finder/    # Cross-system search
│   ├── email-triage/      # Email analysis
│   └── extract-teams-context/  # Messaging extraction
│
├── agents/                # Specialized sub-agents
│   ├── mcp-assistant.md   # Remote vault operations
│   ├── teams.md           # Messaging integration
│   ├── attio.md           # CRM integration
│   ├── context-manager.md # Workflow orchestration
│   └── attio/             # CRM scripts (Bun)
│
├── mcp-server/            # MCP server + web UI
├── .claude-plugin/        # Plugin manifest
│   └── plugin.json
├── .mcp.json              # MCP server config
├── settings.json          # Claude Code settings
└── settings.local.json.example
```

## Workflows

| Command | When | What it does |
|---------|------|-------------|
| `/setup` | First time | Configure vault, integrations, preferences |
| `/today` | Morning | Sync PM tickets, check email/calendar, review tasks |
| `/eob` | End of day | Process Inbox captures, categorize, create tasks |
| `/eow` | Friday | Archive completed tasks, prepare next week |
| `/meeting-prep` | Before meetings | Gather attendee context, CRM data, related work |
| `/context-finder` | Anytime | Search across vault and integrations for any topic |
| `/email-triage` | Anytime | Analyze and categorize emails with Memory context |

## MCP Server

The MCP server enables remote access to your vault from any MCP-compatible tool. It also serves a web UI for browsing your vault from any browser.

```bash
cd mcp-server
./start.sh              # With auth
./start.sh --no-auth    # For Tailscale/local use
```

**Access modes**:
- **[Tailscale](https://tailscale.com) (recommended)** -- Access from any device on your tailnet with zero-config security. The server auto-detects Tailscale and binds to both localhost and your Tailscale IP. Use [MagicDNS](https://tailscale.com/kb/1081/magicdns) to access the vault by machine name (e.g., `http://macbook:9000`) from any device on your network.
- **Local only** -- `localhost:9000`, no authentication needed.
- **Custom** -- OAuth (Auth0) or API key authentication.

**Auto-start**: During `/setup`, you can configure `launchctl` to start the MCP server automatically at login. The server runs in the background and restarts on failure.

**Endpoints**:
- `GET /` -- Web UI for vault browsing
- `POST /mcp` -- Streamable HTTP transport (for Claude Desktop, Cursor, etc.)
- `GET /sse` -- SSE transport (legacy)
- `GET /health` -- Health check

**Connect from Claude Desktop or Cursor**:
```json
{
  "mcpServers": {
    "ambient-context": {
      "url": "http://<your-machine>:9000/mcp"
    }
  }
}
```

## Why Ambient Context

Most AI memory solutions are agent-only -- the AI stores context in a format only it can access. Ambient context is different: **the knowledge base is shared between you and the agent**. The vault is plain markdown files organized in folders you can browse, edit, and search yourself.

This means:
- **You stay in the loop** -- open the vault in [Obsidian](https://obsidian.md) (or any editor) and see exactly what your agent knows. Edit notes, fix inaccuracies, add context the agent missed.
- **No vendor lock-in** -- it's just files. Switch tools, move between agents, or stop using AI entirely. Your knowledge stays with you.
- **Any MCP client benefits** -- connect the MCP server to Claude Code, Claude Desktop, Cursor, Windsurf, or any tool that supports MCP. They all read from and write to the same vault, so context follows you across tools and devices.

## Using the MCP with Other Tools

The MCP server turns your vault into a context layer for any MCP-compatible tool. Here are some practical setups:

### Claude Code (coding sessions)

Add the MCP server to your global Claude Code config (`~/.claude.json`) so every coding session has access to your ambient context:

```json
{
  "mcpServers": {
    "ambient-context": {
      "url": "http://localhost:9000/mcp"
    }
  }
}
```

Now when working on a feature or debugging an issue, Claude Code can:
- **Check `find_context`** before researching a topic -- your vault may already have notes on it
- **Look up people and companies** with `get_memory` when reviewing PRs or tickets from specific teams
- **Capture discoveries** with `add_quick_note` -- useful patterns, API quirks, architecture decisions that you want to remember across sessions
- **Read tasks** with `list_tasks` to stay aligned with your priorities

### Claude Desktop / Claude iOS

Add the same MCP config to Claude Desktop for conversational access to your vault. Useful for:
- Quick lookups while you're away from your IDE ("what was the deal status with Acme?")
- Capturing thoughts on the go via `add_quick_note`
- Meeting prep from your phone

### Cursor / Windsurf / Other Editors

Any editor with MCP support can connect to the same vault. The config format varies, but the endpoint is the same: `http://<your-machine>:9000/mcp`.

### Tips

- **Use Tailscale** for cross-device access. The MCP server auto-detects Tailscale and binds to your tailnet IP, so you can reach it from any device without exposing ports to the internet.
- **Capture as you go** -- the best way to build ambient context is to use `add_quick_note` whenever you learn something worth remembering. Don't worry about organization at capture time -- the `/eob` workflow processes your Inbox daily, categorizing captures into Memory, Tasks, Research, or Writing. The `/eow` workflow archives completed tasks weekly. Everything is kept in `_archive/` folders, so nothing is lost and you can always go back and review.
- **Daily notes in Obsidian** -- the vault includes a daily note template (`_templates/daily_note.md`) ready to use with Obsidian's Daily Notes core plugin. Point the plugin to `Inbox/` as the folder and `_templates/daily_note.md` as the template, and you get a structured capture page each day that `/eob` knows how to process.
- **Review periodically** -- open the vault in Obsidian and browse your Memory notes. Correct anything that's off, merge duplicates, add details the agent missed. The agent works better when the vault is curated.

## How It Works

The vault is just markdown files with YAML frontmatter. Claude Code skills define workflows that process these files -- reading Inbox captures, converting hashtags to metadata, creating task files, updating the central task hub, and archiving completed work.

Integrations are optional layers that connect external tools (email, calendar, CRM, PM) to the vault. Each workflow checks which integrations are configured and adapts accordingly.

The Memory system is the connective tissue. Notes about people and companies are referenced via `[[wiki-links]]` from tasks, meeting notes, and other content. Workflows use Memory to prioritize, contextualize, and enrich information from external sources.

## Requirements

- [Claude Code](https://claude.com/claude-code) CLI
- Git
- [Bun](https://bun.sh) (for MCP server)
- [Tailscale](https://tailscale.com) (optional, recommended for remote access)
- [Obsidian](https://obsidian.md) (optional, recommended for manual browsing)

## License

MIT
