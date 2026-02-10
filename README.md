# OpenClaw Mission Control

Real-time dashboard for monitoring OpenClaw agent sessions, work context, and deploy previews.

## Features

- **Live session monitoring** — See all active agent sessions in real-time
- **Work context detection** — Auto-detects repos, branches, PRs, and preview URLs
- **Session type inference** — Automatically categorizes sessions (coding, research, etc.)
- **Local-first** — Runs entirely on your machine, no cloud dependency
- **Zero-config** — Works out-of-the-box after installation

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

```bash
# Start the dashboard server
mission-control start

# Open dashboard in browser
mission-control open

# Check status
mission-control status

# View logs
mission-control logs

# Stop server
mission-control stop
```

Dashboard will be available at http://localhost:3030

## Requirements

- OpenClaw gateway running
- Node.js 20+
- Active agent sessions in `~/.openclaw/agents/*/sessions/`

## Tech Stack

- **Server:** Node.js, Express, WebSocket
- **Web UI:** React 19, Vite, shadcn/ui, TailwindCSS 4
- **Data source:** Direct session file reads from `~/.openclaw/agents/`

## Development

```bash
# Install dependencies
npm install # (handled by install.sh)

# Start server (dev mode)
cd server && npm run dev

# Start web UI (separate terminal)
cd web && npm run dev
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for implementation details.

## License

MIT — see [LICENSE](LICENSE)

## Links

- [OpenClaw](https://openclaw.ai)
- [ClaWHub Skills](https://clawhub.com)
- [GitHub Issues](https://github.com/jackmarketon/openclaw-mission-control/issues)
