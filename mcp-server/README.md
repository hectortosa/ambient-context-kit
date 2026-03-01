# Ambient Context MCP Server

Ambient computing server that exposes your Obsidian vault via MCP (Model Context Protocol). Access your vault from Claude Desktop, iOS, Cursor, Alexa, or any MCP-compatible client.

## Quick Start

```bash
# Install dependencies
~/.bun/bin/bun install

# Copy and configure environment
cp .env.example .env
# Edit .env and set VAULT_MCP_API_KEY

# Start server
~/.bun/bin/bun run start
```

Server runs at `http://localhost:3847`

## Remote Access (HTTPS)

For secure remote access, use Microsoft Dev Tunnels:

```bash
# One-time setup
brew install --cask devtunnel
devtunnel user login
devtunnel create vault-mcp --allow-anonymous
devtunnel port create vault-mcp -p 3847

# Start server with tunnel
./start-with-tunnel.sh
```

This gives you an HTTPS URL like `https://vault-mcp-xxxxx.euw.devtunnels.ms`

## Authentication

### OAuth 2.1 with Auth0 (Recommended)

For production and Claude.ai custom connectors, use OAuth 2.1 with Auth0:

#### 1. Auth0 Setup

1. Create account at https://auth0.com (Free tier: 25,000 MAU)
2. Create a new tenant (e.g., `ambient-context`)
3. Create an API:
   - **Identifier**: `https://vault-mcp.yourdomain.com`
   - **Permissions**: `read:vault`, `write:vault`, `prepare:meeting`
4. Create an Application (Regular Web Application):
   - **Callback URL**: `https://claude.ai/api/mcp/auth_callback`
   - Note the **Client ID** and **Client Secret**

#### 2. Server Configuration

Add to your `.env`:

```bash
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://vault-mcp.yourdomain.com
AUTH0_REQUIRED_SCOPES=read:vault
```

#### 3. Claude.ai Custom Connector

1. Go to Settings > Custom Connectors > Add
2. Enter MCP URL: `https://your-tunnel-url/mcp`
3. Click Advanced Settings
4. Enter Auth0 Client ID and Secret
5. Complete OAuth authorization

#### OAuth Discovery Endpoints

| Endpoint | Description |
|----------|-------------|
| `/.well-known/oauth-authorization-server` | OAuth 2.0 metadata |
| `/.well-known/openid-configuration` | OpenID Connect metadata |
| `/.well-known/oauth-protected-resource` | Protected resource metadata (RFC 9728) |

### API Key (Development/Fallback)

For local development, enable API key fallback:

```bash
# In .env
ALLOW_API_KEY_FALLBACK=true
VAULT_MCP_API_KEY=your-secure-api-key
```

```bash
curl -X POST http://localhost:3847/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

## Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/mcp` | HEAD | No | MCP protocol version |
| `/mcp` | POST | Yes | Streamable HTTP (for Claude.ai) |
| `/sse` | GET | Yes | SSE transport (legacy) |
| `/message` | POST | Yes | SSE messages |
| `/.well-known/oauth-authorization-server` | GET | No | OAuth metadata |
| `/.well-known/openid-configuration` | GET | No | OIDC metadata |
| `/.well-known/oauth-protected-resource` | GET | No | Resource metadata |

## Available Tools

### Read Operations

| Tool | Description |
|------|-------------|
| `list_toc` | Get vault Table of Contents |
| `list_tasks` | Get current task list from Tasks/Main.md |
| `get_memory` | Look up person/company from Memory |
| `find_context` | Search vault by query, type, or tags |

### Write Operations

| Tool | Description |
|------|-------------|
| `add_quick_note` | Add note to Inbox |
| `update_task` | Mark task complete or add notes |
| `update_meeting_note` | Add content to meeting notes |

### Complex Operations

| Tool | Description |
|------|-------------|
| `prepare_meeting` | Run meeting prep workflow |

## Usage Examples

### List Tasks

```bash
curl -X POST http://localhost:3847/mcp \
  -H "Authorization: Bearer $VAULT_MCP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "list_tasks",
      "arguments": { "section": "today" }
    }
  }'
```

### Get Memory Note

```bash
curl -X POST http://localhost:3847/mcp \
  -H "Authorization: Bearer $VAULT_MCP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "get_memory",
      "arguments": { "name": "Acme Corp" }
    }
  }'
```

### Add Quick Note

```bash
curl -X POST http://localhost:3847/mcp \
  -H "Authorization: Bearer $VAULT_MCP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "add_quick_note",
      "arguments": {
        "content": "Review Q1 roadmap",
        "tags": ["week", "work"]
      }
    }
  }'
```

### Prepare Next Meeting

```bash
curl -X POST http://localhost:3847/mcp \
  -H "Authorization: Bearer $VAULT_MCP_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "prepare_meeting",
      "arguments": { "meeting": "next" }
    }
  }'
```

## Claude Desktop Configuration

Add to your Claude Desktop MCP config:

```json
{
  "mcpServers": {
    "ambient-context": {
      "url": "https://vault-mcp-xxxxx.euw.devtunnels.ms/sse",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

## Architecture

```
┌─────────────────────────────────────────┐
│         External AI Clients             │
│  (Claude Desktop, iOS, Cursor, etc.)    │
└───────────────────┬─────────────────────┘
                    │ HTTPS (via Dev Tunnel)
                    │ Authorization: Bearer <key>
┌───────────────────▼─────────────────────┐
│           MCP Server (Bun)              │
│                                         │
│  Simple tools: Direct file operations   │
│  Complex tools: Claude CLI invocation   │
└───────────────────┬─────────────────────┘
                    │
                    │ claude -p "/mcp-assistant ..."
                    │
┌───────────────────▼─────────────────────┐
│         mcp-assistant Agent             │
│                                         │
│  - Headless operation optimized         │
│  - Can invoke existing skills           │
│  - Returns structured markdown          │
└───────────────────┬─────────────────────┘
                    │
                    ▼
              Obsidian Vault
```

## TOC Generation

The server maintains a Table of Contents at `_TOC.md`:
- Generated on server startup
- Regenerated after write operations
- Can be regenerated manually: `bun run toc:generate`

## Development

```bash
# Run with hot reload
~/.bun/bin/bun run dev

# Generate TOC manually
~/.bun/bin/bun run toc:generate
```

## Troubleshooting

### Server won't start
- Check `.env` file exists with valid `VAULT_MCP_API_KEY`
- Verify bun is installed: `~/.bun/bin/bun --version`
- Check port 3847 is available

### Auth failures
- Ensure `Authorization: Bearer <key>` header is set
- Verify key matches `VAULT_MCP_API_KEY` in `.env`

### Claude CLI tools not working
- Verify `claude` is in PATH or set `CLAUDE_CLI_PATH` in `.env`
- Ensure Claude Code is authenticated

### Remote access not working
- Verify Dev Tunnel is running: `devtunnel host vault-mcp`
- Check tunnel URL is correct
- Ensure tunnel allows anonymous access
