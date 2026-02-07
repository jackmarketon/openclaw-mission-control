# Changelog

## v1.0.0 (2026-02-07)

**Initial Release** 🎉

### Features

- **Live Session Monitoring** — Real-time dashboard showing all active OpenClaw agent sessions
- **Smart Metadata Extraction** — Auto-detects repos, branches, PRs, and deploy previews from session files
- **Search & Filtering** — Find sessions by type (coding/research/testing), status, repo, or agent
- **Expandable Details** — Click any session row to view full details, timestamps, and quick links
- **WebSocket Updates** — Dashboard updates instantly when sessions change (no polling)
- **Stats Overview** — Quick view of total sessions, active count, coding work, and PRs
- **CLI Wrapper** — Start/stop/status/logs commands for easy management
- **One-Command Install** — Automated installation script with dependency checks

### Technical Details

- **Server**: Node.js 20+, Express, WebSocket
- **Web UI**: React 19, Vite, shadcn/ui, Tailwind CSS v3
- **Metadata Cache**: In-memory + persistent snapshot (rebuilds when stale)
- **File Watching**: Real-time session file monitoring with fs.watch
- **Extractors**: Repo/branch (from git commands), PRs (from gh CLI), previews (Netlify/Vercel URLs)

### Supported Metadata

- Repository name and owner
- Current branch
- Pull request number, URL, and state (merged/open)
- Deploy preview URLs (Netlify, Vercel)
- Session type inference (coding, research, testing, chat, deployment)
- Activity status (active <5min, idle 5-60min, completed >60min)
- Message and tool call counts

### Installation

```bash
git clone https://github.com/jackmarketon/openclaw-mission-control.git ~/.openclaw/skills/mission-control
cd ~/.openclaw/skills/mission-control
./install.sh
```

### Usage

```bash
mission-control start
mission-control open
```

Dashboard available at http://localhost:3030

### Known Limitations

- No GitHub API integration (preview URLs extracted from tool outputs only)
- No authentication (localhost-only by default)
- Session history not persisted (rebuilds from JSONL files on server start)
- No mobile-optimized layout

### Future Enhancements

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution areas:
- Linear ticket integration
- Session history timeline view
- Export features (CSV, JSON)
- Charts and visualizations
- Error tracking
- Mobile responsive design

---

**Full Changelog**: https://github.com/jackmarketon/openclaw-mission-control/commits/v1.0.0
