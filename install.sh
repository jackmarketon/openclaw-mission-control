#!/bin/bash
set -e

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REQUIRED_NODE_VERSION=20

echo "🎛️  Mission Control Installation"
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed"
  echo "   Please install Node.js v${REQUIRED_NODE_VERSION}+ from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
  echo "❌ Node.js v${REQUIRED_NODE_VERSION}+ required (found v${NODE_VERSION})"
  echo "   Please upgrade Node.js from https://nodejs.org"
  exit 1
fi

echo "✓ Node.js v$(node -v) detected"
echo ""

# Install server dependencies
echo "📦 Installing server dependencies..."
cd "$SKILL_DIR/server"
npm install --silent --no-progress 2>&1 | grep -v "^npm warn" || true
echo "✓ Server dependencies installed"

# Install web dependencies
echo "📦 Installing web dependencies..."
cd "$SKILL_DIR/web"
npm install --silent --no-progress 2>&1 | grep -v "^npm warn" || true
echo "✓ Web dependencies installed"

# Build web UI
echo "🏗️  Building web UI..."
npm run build --silent 2>&1 | grep -E "✓|built" || true
echo "✓ Web UI built"

# Make CLI executable
chmod +x "$SKILL_DIR/bin/mission-control"

# Try to symlink to ~/.openclaw/bin if it exists
if [ -d "$HOME/.openclaw/bin" ]; then
  ln -sf "$SKILL_DIR/bin/mission-control" "$HOME/.openclaw/bin/mission-control" 2>/dev/null || true
  echo "✓ CLI linked to ~/.openclaw/bin/mission-control"
else
  echo "⚠️  ~/.openclaw/bin not found - add to PATH manually:"
  echo "   export PATH=\"\$PATH:$SKILL_DIR/bin\""
fi

echo ""
echo "✅ Mission Control installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Start the server:"
echo "     mission-control start"
echo ""
echo "  2. Open the dashboard:"
echo "     mission-control open"
echo ""
echo "  3. View status:"
echo "     mission-control status"
echo ""
echo "Dashboard will be available at http://localhost:3030"
