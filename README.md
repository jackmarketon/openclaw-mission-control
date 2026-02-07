# OpenClaw Mission Control

**Real-time dashboard for monitoring OpenClaw agent sessions.**

Monitor all your agent sessions in one place: see what they're working on, track PRs, view deploy previews, and get live updates as sessions progress.

## ✨ Features

- **📊 Live Session Monitoring** — Real-time view of all active agent sessions
- **🔍 Smart Metadata Detection** — Auto-extracts repos, branches, PRs, and deploy previews
- **🎯 Filtering & Search** — Find sessions by type, status, repo, or agent
- **📈 Stats Overview** — Quick glance at active sessions, coding work, and PRs
- **🔗 Quick Links** — Jump to PRs, deploy previews, or repositories
- **⚡ WebSocket Updates** — Dashboard updates instantly when sessions change
- **🌙 Dark Theme** — Easy on the eyes for long monitoring sessions

## 🚀 Quick Start

### Installation

```bash
# Clone or install via OpenClaw
git clone https://github.com/jackmarketon/openclaw-mission-control.git ~/.openclaw/skills/mission-control
cd ~/.openclaw/skills/mission-control
./install.sh
```

### Usage

```bash
# Start the dashboard server
mission-control start

# Open in browser (http://localhost:3030)
mission-control open

# Check status
mission-control status

# View logs
mission-control logs

# Stop server
mission-control stop
```

## 📸 Screenshot

Dashboard shows:
- Session type badges (coding, research, testing, chat, deployment)
- Repository and branch information
- PR numbers with links
- Deploy preview URLs (Netlify, Vercel)
- Status indicators (active, idle, completed)
- Expandable details for each session

## 🎯 What It Detects

Mission Control automatically extracts metadata from your sessions:

- **Repository & Branch** — From `git worktree`, `git checkout`, `cd ~/Code/...` commands
- **Pull Requests** — From `gh pr create`, `gh pr view`, `gh pr merge` outputs
- **Deploy Previews** — Netlify and Vercel URLs from tool outputs
- **Session Type** — Inferred from tool usage patterns (exec, file ops, web search, etc.)
- **Activity Status** — Active (<5min), Idle (5-60min), Completed (>60min)

## 🏗️ Architecture

Mission Control runs as a standalone local service:

```
┌─────────────────┐
│  Session Files  │ ~/.openclaw/agents/*/sessions/*.jsonl
└────────┬────────┘
         │ (file watch)
         ▼
┌─────────────────┐
│ Session Monitor │ Detects changes and extracts metadata
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Metadata Cache  │ In-memory + persistent snapshot
└────────┬────────┘
         │
         ├──────────────┐
         ▼              ▼
    REST API      WebSocket
         │              │
         └──────┬───────┘
                ▼
         ┌──────────────┐
         │  React UI    │ Dashboard at localhost:3030
         └──────────────┘
```

**Key Components:**
- **Server** (`server/`): Node.js + Express + WebSocket
- **Web UI** (`web/`): React 19 + Vite + shadcn/ui + Tailwind
- **CLI** (`bin/mission-control`): Start/stop/status commands
- **Metadata Extractors** (`server/lib/extractors.js`): Parse session files for context

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed technical design.

## 🛠️ Development

```bash
# Install dependencies
./install.sh

# Start server in dev mode
cd server && npm run dev

# Start web UI in dev mode (separate terminal)
cd web && npm run dev

# Build for production
cd web && npm run build
```

### Project Structure

```
openclaw-mission-control/
├── server/              # Backend (Express + WebSocket)
│   ├── index.js         # Main server
│   └── lib/
│       ├── metadata-cache.js      # Session cache
│       ├── session-monitor.js     # File watcher
│       ├── extractors.js          # Metadata extraction
│       └── types.js               # Type definitions
├── web/                 # Frontend (React + Vite)
│   └── src/
│       ├── App.jsx               # Main app
│       ├── components/
│       │   ├── SessionTable.jsx  # Session list
│       │   └── SessionFilters.jsx # Filter controls
│       └── components/ui/        # shadcn/ui components
├── bin/
│   └── mission-control  # CLI wrapper
├── docs/                # Documentation
├── install.sh           # Installation script
└── README.md
```

## 🔧 Configuration

Mission Control works out-of-the-box with sensible defaults.

**Environment Variables:**
- `MISSION_CONTROL_PORT` — Server port (default: 3030)

**Cache Location:**
- `~/.openclaw/mission-control/cache.json`

Cache rebuilds automatically when stale (>24h) or on server restart.

## 📋 Requirements

- **Node.js v20+**
- **OpenClaw** — Running gateway with active agent sessions
- **Disk Access** — Read access to `~/.openclaw/agents/*/sessions/`

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup.

**Areas for Contribution:**
- Additional metadata extractors (Linear tickets, deploy statuses, error tracking)
- UI enhancements (charts, timeline view, session history)
- Export features (CSV, JSON, session reports)
- Configuration UI
- Mobile-responsive improvements

## 📄 License

MIT — see [LICENSE](LICENSE)

## 🔗 Links

- [OpenClaw](https://openclaw.ai)
- [ClaWHub Skills](https://clawhub.com)
- [Documentation](docs/)
- [Issues](https://github.com/jackmarketon/openclaw-mission-control/issues)

---

**Built for OpenClaw** — The AI agent framework for building autonomous, locally-hosted agents.
