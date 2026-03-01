#!/bin/bash
#
# Start Ambient Context MCP Server
#
# Usage:
#   ./start.sh              # Start with authentication enabled
#   ./start.sh --no-auth    # Start without authentication (for Tailscale/local use)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Check for .env file
if [ ! -f .env ]; then
  echo "Error: .env file not found"
  echo "Copy .env.example to .env and configure it"
  exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Parse flags
for arg in "$@"; do
  case $arg in
    --no-auth)
      export NO_AUTH=true
      ;;
  esac
done

# Check for bun
BUN_PATH="${HOME}/.bun/bin/bun"
if [ ! -f "$BUN_PATH" ]; then
  BUN_PATH="$(which bun 2>/dev/null || true)"
  if [ -z "$BUN_PATH" ]; then
    echo "Error: bun not found. Install it: curl -fsSL https://bun.sh/install | bash"
    exit 1
  fi
fi

echo "Starting Ambient Context MCP Server..."
echo "Port: ${MCP_SERVER_PORT:-9000}"
if [ "$NO_AUTH" = "true" ]; then
  echo "Auth: DISABLED (use network-level security e.g. Tailscale)"
fi
echo ""

exec "$BUN_PATH" run start
