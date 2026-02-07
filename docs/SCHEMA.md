# Session Metadata Schema

Mission Control tracks enriched metadata for each OpenClaw session beyond what's stored in session JSONL files.

## Core Session Data (from JSONL)

Every session file (`~/.openclaw/agents/{agentId}/sessions/{sessionId}.jsonl`) contains:

```jsonl
{"type":"session","version":3,"id":"<uuid>","timestamp":"<iso>","cwd":"<path>"}
{"type":"message","role":"user|assistant","content":[...],"timestamp":"<iso>"}
{"type":"custom","customType":"model-snapshot|tool-result|...","data":{...}}
```

## Enriched Metadata (Mission Control Cache)

Mission Control extracts and infers additional metadata for efficient dashboard display:

### Schema

```typescript
interface SessionMetadata {
  // Core identifiers
  id: string;                    // Session UUID
  agentId: string;               // Agent ID (lowlight, wrenchlogr, etc.)
  
  // Work context (extracted from tool calls)
  repo?: string;                 // Repository name (e.g., "openclaw-mission-control")
  repoOwner?: string;            // Owner/org (e.g., "jackmarketon")
  branch?: string;               // Current branch
  pr?: {
    number: number;              // PR number
    url: string;                 // Full PR URL
    title?: string;              // PR title (if fetched)
    state?: 'open' | 'closed' | 'merged';
  };
  preview?: {
    url: string;                 // Deploy preview URL
    provider: 'netlify' | 'vercel' | 'other';
    status?: 'building' | 'ready' | 'error';
  };
  
  // Session classification
  type: 'coding' | 'research' | 'testing' | 'deployment' | 'chat' | 'unknown';
  
  // Activity tracking
  status: 'active' | 'idle' | 'completed';
  createdAt: string;             // ISO timestamp (first session message)
  lastActive: string;            // ISO timestamp (most recent message)
  messageCount: number;          // Total messages in session
  toolCalls: number;             // Total tool invocations
  
  // Linear integration (optional)
  linear?: {
    ticketId: string;            // Linear ticket identifier (e.g., PER-171)
    ticketUrl: string;           // Full Linear ticket URL
    ticketTitle?: string;        // Ticket title (if fetched)
  };
  
  // Workspace info
  workspace?: string;            // Workspace path (if not default)
  cwd: string;                   // Working directory at session start
}
```

## Extraction Rules

### Repository Detection

Extracted from `exec` tool calls:

```jsonl
{"type":"message","role":"assistant","content":[{
  "type":"tool_use",
  "name":"exec",
  "input":{"command":"git status"}
}]}
```

Extract repo from:
- `git remote get-url origin` output
- `git status` when in a git repo
- `gh pr create` output
- Working directory path matching `~/Code/{owner}/{repo}`

### Branch Detection

```bash
exec: git branch --show-current
exec: git status  # "On branch feature/xyz"
```

### PR Detection

```bash
exec: gh pr create --fill          # Output: "https://github.com/owner/repo/pull/123"
exec: gh pr view <number>          # Output contains PR URL
exec: gh pr merge <number> --auto  # Captures PR number
```

### Preview URL Detection

From GitHub PR status checks:

```bash
exec: gh pr checks <number> --json url,conclusion
```

Parse output for Netlify/Vercel deploy URLs.

### Session Type Inference

**Priority order (first match wins):**

1. **Explicit metadata:** If session has `customType: "session-type"` entry, use that
2. **Tool pattern matching:**
   - **coding:** High ratio of `exec` (git commands), `Write`, `Edit`, `Read` + PR activity
   - **research:** Frequent `web_search`, `web_fetch`, `browser` calls
   - **testing:** `exec` with test runners (vitest, jest, pytest, npm test)
   - **deployment:** `message` to deploy channels, PR merge activity
   - **chat:** No tool calls, only text messages
3. **Default:** `unknown`

### Status Tracking

- **active:** Last message within 5 minutes
- **idle:** Last message 5-60 minutes ago
- **completed:** Session ended (final message > 60 minutes ago OR session file hasn't changed in 24h)

## Storage

### In-Memory Cache

Server maintains a `Map<sessionId, SessionMetadata>` for fast lookups.

### Persistent Cache

Snapshot written to `~/.openclaw/mission-control/cache.json`:

```json
{
  "version": 1,
  "lastUpdated": "2026-02-07T03:00:00.000Z",
  "sessions": {
    "<session-id>": { /* SessionMetadata */ },
    ...
  }
}
```

Cache is rebuilt from session files on server start if:
- Missing
- Stale (> 24h old)
- Version mismatch

### No Migration Needed

Session JSONL files are **never modified**. Mission Control only reads them.

Cache is derived data — it can be deleted and rebuilt anytime without data loss.

## API Response Format

### `GET /api/sessions`

```json
[
  {
    "id": "c234329c-40a2-4b3c-aa12-54223236684f",
    "agentId": "lowlight",
    "repo": "openclaw-mission-control",
    "repoOwner": "jackmarketon",
    "branch": "jmarketon/per-172-design-session-metadata-schema",
    "pr": {
      "number": 2,
      "url": "https://github.com/jackmarketon/openclaw-mission-control/pull/2",
      "state": "open"
    },
    "type": "coding",
    "status": "active",
    "createdAt": "2026-02-07T01:35:31.140Z",
    "lastActive": "2026-02-07T03:22:15.500Z",
    "messageCount": 42,
    "toolCalls": 18,
    "workspace": "/home/jmarketon/.openclaw/workspaces/openclaw-mission-control",
    "cwd": "/home/jmarketon/Code/jackmarketon/openclaw-mission-control"
  }
]
```

**Privacy filtering:** Never include full message content or raw tool call data in API responses.

## WebSocket Update Format

When session metadata changes (new tool call, status transition):

```json
{
  "type": "session_update",
  "sessionId": "c234329c-40a2-4b3c-aa12-54223236684f",
  "changes": {
    "branch": "new-branch-name",
    "lastActive": "2026-02-07T03:25:00.000Z",
    "toolCalls": 19
  },
  "timestamp": "2026-02-07T03:25:00.123Z"
}
```

Only changed fields are included in `changes` object.

## Future Extensions

Possible additions (not in v1):

- **Error tracking:** Count of failed tool calls
- **Model usage:** Which model(s) used in session
- **Cost tracking:** Token usage and estimated cost
- **Sub-agent tracking:** Parent/child session relationships
- **Tags/labels:** User-defined session tags

---

*This schema is v1. Update as requirements evolve.*
