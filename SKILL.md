---
name: mission-control
version: 0.1.0
description: Real-time dashboard for monitoring OpenClaw agent sessions, work context, and deploy previews.
metadata: {"clawdbot":{"emoji":"🎛️","requires":{"bins":["node"]},"install":[{"id":"custom","kind":"script","script":"./install.sh","label":"Install mission-control dependencies"}]}}
---

# mission-control

Real-time monitoring dashboard for OpenClaw agent sessions.

## What It Does

Provides a live web dashboard showing:
- All active agent sessions
- Current work context (repo, branch, PR, preview URL)
- Session type (coding, research, testing, etc.)
- Real-time updates as sessions progress

## Installation

```bash
openclaw skill install mission-control
```

Or manually:

```bash
git clone https://github.com/jackmarketon/openclaw-mission-control.git ~/.openclaw/skills/mission-control
cd ~/.openclaw/skills/mission-control
./install.sh
```

## Usage

### Start the Dashboard

```bash
mission-control start
```

Server runs in the background on http://localhost:3030

### Open in Browser

```bash
mission-control open
```

### Check Status

```bash
mission-control status
```

### View Logs

```bash
mission-control logs
```

### Stop the Server

```bash
mission-control stop
```

## How It Works

1. **Monitors session files** in `~/.openclaw/agents/*/sessions/*.jsonl`
2. **Parses tool calls** to extract repo/branch/PR/preview metadata
3. **Caches aggregated data** for fast dashboard loading
4. **Pushes live updates** via WebSocket when sessions change
5. **Serves web UI** with sortable, filterable session table

## Requirements

- Node.js 20+
- OpenClaw installed and configured
- Active agent sessions

## Configuration

Default config is auto-generated on first run. Override with `~/.openclaw/skills/mission-control/config.json`:

```json
{
  "port": 3030,
  "bind": "localhost",
  "cachePath": "~/.openclaw/mission-control/cache.json",
  "logLevel": "info"
}
```

## Troubleshooting

**Dashboard won't load:**
- Check if server is running: `mission-control status`
- View logs: `mission-control logs`
- Restart: `mission-control stop && mission-control start`

**Sessions not appearing:**
- Ensure `~/.openclaw/agents/` directory exists
- Check session files exist in `~/.openclaw/agents/*/sessions/`
- Verify file permissions (server needs read access)

**Live updates not working:**
- Check WebSocket connection in browser console
- Verify no firewall blocking localhost:3030

## Links

- [Full README](https://github.com/jackmarketon/openclaw-mission-control)
- [Architecture docs](https://github.com/jackmarketon/openclaw-mission-control/blob/main/docs/ARCHITECTURE.md)
- [Report issues](https://github.com/jackmarketon/openclaw-mission-control/issues)
