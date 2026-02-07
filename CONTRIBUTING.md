# Contributing to Mission Control

Thanks for your interest in contributing! This guide will help you get set up.

## Development Setup

### Prerequisites

- Node.js v20+
- npm or pnpm
- OpenClaw installed and running (for testing with real sessions)

### Initial Setup

```bash
# Clone the repo
git clone https://github.com/jackmarketon/openclaw-mission-control.git
cd openclaw-mission-control

# Install dependencies
./install.sh

# Or install manually:
cd server && npm install
cd ../web && npm install
```

### Running in Development Mode

**Server** (with hot reload):
```bash
cd server
npm run dev
```

Server runs on http://localhost:3030

**Web UI** (with Vite HMR):
```bash
cd web
npm run dev
```

UI runs on http://localhost:5173 with API proxy to the server.

### Testing

```bash
# Server tests (when available)
cd server && npm test

# Web tests (when available)
cd web && npm test

# Manual testing
mission-control start
# Open http://localhost:3030 and verify features work
mission-control stop
```

## Project Structure

```
server/
├── index.js                 # Express server + WebSocket
└── lib/
    ├── metadata-cache.js    # Session cache (read/write/rebuild)
    ├── session-monitor.js   # File watcher (fs.watch)
    ├── extractors.js        # Metadata extraction logic
    └── types.js             # JSDoc type definitions

web/
├── src/
│   ├── App.jsx             # Main app component
│   ├── components/
│   │   ├── SessionTable.jsx      # Session list with expand/collapse
│   │   ├── SessionFilters.jsx    # Search and filter controls
│   │   └── ui/                   # shadcn/ui components
│   └── lib/
│       └── utils.js        # Utility functions
├── vite.config.js          # Vite configuration
└── tailwind.config.js      # Tailwind CSS configuration
```

## Key Concepts

### Session Metadata Flow

1. **Session Files** — OpenClaw writes JSONL files to `~/.openclaw/agents/*/sessions/`
2. **Monitor** — `session-monitor.js` watches for file changes via `fs.watch()`
3. **Extractors** — Parse JSONL entries to extract repo, branch, PR, preview URLs
4. **Cache** — Aggregated metadata stored in-memory + persisted to disk
5. **API** — REST endpoints serve session list (`/api/sessions`)
6. **WebSocket** — Broadcasts live updates when sessions change
7. **UI** — React components consume API and WebSocket for real-time updates

### Adding New Extractors

To extract additional metadata (e.g., Linear tickets, deploy statuses):

1. Add extraction function to `server/lib/extractors.js`:
   ```javascript
   export function extractLinearTicket(lines) {
     // Parse session lines for Linear ticket IDs
     // Return { ticketId, ticketUrl, ... }
   }
   ```

2. Call from `metadata-cache.js` in `_parseSessionFile`:
   ```javascript
   const linear = extractLinearTicket(lines);
   // Add to metadata return object
   ```

3. Update type definitions in `server/lib/types.js`

4. Add UI display in `web/src/components/SessionTable.jsx`

### Adding UI Components

We use **shadcn/ui** for components. To add a new component:

```bash
cd web
npx shadcn@latest add <component-name>
```

This installs the component source to `web/src/components/ui/`.

## Code Style

- **JavaScript**: ES modules, async/await preferred
- **Comments**: JSDoc for all exported functions
- **Formatting**: Prettier (if available)
- **Naming**:
  - Components: PascalCase (e.g., `SessionTable.jsx`)
  - Functions: camelCase (e.g., `extractRepoAndBranch`)
  - Files: kebab-case for non-components (e.g., `metadata-cache.js`)

## Commit Messages

Follow conventional commits:

```
feat: Add Linear ticket integration
fix: Resolve cache rebuild race condition
docs: Update architecture diagram
chore: Upgrade dependencies
```

## Pull Request Process

1. **Branch from `main`**: `git checkout -b feature/your-feature`
2. **Make changes** and test locally
3. **Commit** with clear messages
4. **Push** to your fork: `git push origin feature/your-feature`
5. **Open PR** with description of changes
6. **Wait for review** — maintainers will provide feedback

### PR Checklist

- [ ] Code builds without errors (`npm run build`)
- [ ] No console warnings in browser
- [ ] Tested with real OpenClaw sessions
- [ ] Documentation updated (if needed)
- [ ] Type definitions updated (if adding new fields)

## Areas for Contribution

### High Priority

- **Export Features** — CSV, JSON session reports
- **Error Tracking** — Capture and display failed tool calls
- **Session History** — View full message history for a session
- **Configuration UI** — Web-based settings instead of env vars

### Medium Priority

- **Charts & Visualizations** — Session activity over time, tool usage stats
- **Linear Integration** — Show ticket status, auto-link sessions to tickets
- **Mobile Responsive** — Better mobile/tablet layouts
- **Performance** — Optimize for 500+ sessions

### Low Priority

- **GitHub API Integration** — Fetch PR status checks, deploy statuses
- **Custom Themes** — Light mode, custom color schemes
- **Keyboard Shortcuts** — Navigate dashboard with keyboard
- **Session Annotations** — Add notes/tags to sessions

## Questions?

- Open an issue on GitHub
- Check existing issues for similar questions
- Ping maintainers in OpenClaw Discord

## License

By contributing, you agree your contributions will be licensed under MIT.
