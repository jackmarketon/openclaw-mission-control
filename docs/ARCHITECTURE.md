# Architecture

Mission Control is a real-time monitoring dashboard for OpenClaw agent sessions.

## Overview

```
┌─────────────────┐
│  Session Files  │ ~/.openclaw/agents/*/sessions/*.jsonl
└────────┬────────┘
         │
         │ (file watch)
         ▼
┌─────────────────┐
│ Session Monitor │ Detects file changes
└────────┬────────┘
         │
         │ (parse & extract metadata)
         ▼
┌─────────────────┐
│ Metadata Cache  │ In-memory + persistent snapshot
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────┐   ┌──────────────┐
│  REST API   │   │  WebSocket   │
│ /api/sessions│   │ Live updates │
└──────┬──────┘   └──────┬───────┘
       │                 │
       └────────┬────────┘
                │
                ▼
         ┌──────────────┐
         │  Web UI      │ React + shadcn/ui + Tailwind
         │  Dashboard   │
         └──────────────┘
```

## Components

### 1. Session Monitor (`server/lib/session-monitor.js`)

Watches `~/.openclaw/agents/*/sessions/*.jsonl` for changes:
- Uses `fs.watch()` for file system events
- Parses new JSONL entries
- Extracts metadata from tool calls
- Triggers cache updates

### 2. Metadata Cache (`server/lib/metadata-cache.js`)

Aggregates session data for fast lookups:
- **In-memory:** Current session state (repo, branch, PR, etc.)
- **Persistent:** Writes snapshot to disk periodically
- **Fallback:** Reads from disk on server restart

### 3. Preview Detector (`server/lib/preview-detector.js`)

Fetches deploy preview URLs:
- Parses `gh pr view` output for PR numbers
- Queries GitHub API for PR status checks
- Extracts Netlify/Vercel preview URLs
- Caches results per PR

### 4. Server (`server/index.js`)

Express server with WebSocket support:
- **REST API:** `/api/sessions` (list all sessions)
- **WebSocket:** Push live updates on session changes
- **Static:** Serves built web UI from `web/dist/`

### 5. Web UI (`web/src/`)

React dashboard:
- **App.jsx:** Main layout, session table
- **SessionTable.jsx:** Sortable, filterable table (to be added)
- **WebSocket client:** Connects to server for live updates
- **shadcn/ui:** Pre-built components (Table, Badge, etc.)

## Data Flow

1. **Agent executes tool** (e.g., `exec git status`, `gh pr create`)
2. **Session file updated** with new JSONL entry
3. **Monitor detects change** via fs.watch
4. **Metadata extracted** from tool call output
5. **Cache updated** with new repo/branch/PR data
6. **WebSocket broadcast** sends update to connected clients
7. **UI updates** session table in real-time

## Session Metadata Schema

See [`docs/SCHEMA.md`](SCHEMA.md) for the complete schema definition and extraction rules.

TypeScript definitions are in [`server/lib/types.js`](../server/lib/types.js) (JSDoc for Node.js compatibility).

**Quick reference:**

```typescript
interface SessionMetadata {
  id: string;
  agentId: string;
  repo?: string;
  repoOwner?: string;
  branch?: string;
  pr?: { number, url, title?, state? };
  preview?: { url, provider, status? };
  type: 'coding' | 'research' | 'testing' | 'deployment' | 'chat' | 'unknown';
  status: 'active' | 'idle' | 'completed';
  createdAt: string;
  lastActive: string;
  messageCount: number;
  toolCalls: number;
  linear?: { ticketId, ticketUrl, ticketTitle? };
  workspace?: string;
  cwd: string;
}
```

## Type Inference

Session type is inferred from tool usage patterns:

- **coding:** `exec` with git commands, `gh pr create`, file writes
- **research:** `web_search`, `web_fetch`, `browser` calls
- **testing:** `exec` with test runners (vitest, jest, pytest)
- **deployment:** `message` to deploy channels, PR status checks

Explicit metadata (if agent sets it) overrides inference.

## Security

- **Local-only:** Server binds to `localhost` by default
- **No auth:** Assumes single-user machine
- **Session privacy:** Never logs full session content
- **API filtering:** Redacts sensitive data from responses

## Performance

- **Fast loading:** Cache loads in <100ms with 50+ sessions
- **Live updates:** WebSocket pushes in <1s of file change
- **Memory footprint:** ~50MB for typical workload (10-20 active sessions)

## Future Improvements

- [ ] Session archive (move old sessions to history)
- [ ] Search/filter by repo, agent, or type
- [ ] Session detail view (full message history)
- [ ] Linear ticket integration (show linked tickets)
- [ ] Export session data (JSON, CSV)

---

*This document evolves as architecture changes. Keep it current.*
