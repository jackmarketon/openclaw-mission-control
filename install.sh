#!/bin/bash
set -e

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing Mission Control dependencies..."

# Install server dependencies
echo "→ Installing server dependencies..."
cd "$SKILL_DIR/server"
npm install --silent

# Install web dependencies
echo "→ Installing web dependencies..."
cd "$SKILL_DIR/web"
npm install --silent

# Build web UI for production
echo "→ Building web UI..."
npm run build --silent

# Make CLI executable
chmod +x "$SKILL_DIR/bin/mission-control"

echo "✓ Mission Control installed successfully"
echo ""
echo "Start the dashboard:"
echo "  mission-control start"
echo ""
echo "Open in browser:"
echo "  mission-control open"
