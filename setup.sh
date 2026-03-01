#!/bin/bash
# Ambient Context - Bootstrap Script
# Run this after cloning to set up your vault and integrations.
#
# Usage:
#   ./setup.sh
#
# This opens Claude Code and runs the /setup skill interactively.

set -e

echo "=== Ambient Context Setup ==="
echo ""
echo "This will launch Claude Code to walk you through setup."
echo "You'll configure your vault location, integrations, and preferences."
echo ""

# Check for Claude Code
if ! command -v claude &> /dev/null; then
  echo "Error: Claude Code CLI not found."
  echo "Install it from: https://docs.anthropic.com/en/docs/claude-code"
  exit 1
fi

# Run the setup skill
claude --cwd "$(dirname "$0")" "/setup"
