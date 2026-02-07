// Mission Control Server
// Monitors OpenClaw sessions and serves dashboard API

import express from 'express';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MetadataCache } from './lib/metadata-cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.MISSION_CONTROL_PORT || 3030;
const app = express();

// Initialize metadata cache
const cache = new MetadataCache();
await cache.init();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    cache: {
      sessions: cache.sessions.size,
      lastUpdated: cache.lastUpdated,
    },
  });
});

// API: List sessions
app.get('/api/sessions', (req, res) => {
  const sessions = cache.getSessions();
  res.json(sessions);
});

// API: Get single session
app.get('/api/sessions/:id', (req, res) => {
  const session = cache.getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

// API: Rebuild cache (manual trigger)
app.post('/api/cache/rebuild', async (req, res) => {
  console.log('Manual cache rebuild triggered');
  await cache.rebuild();
  res.json({ status: 'ok', sessions: cache.sessions.size });
});

// Serve static web UI
const webDistPath = join(__dirname, '../web/dist');
app.use(express.static(webDistPath));

// Fallback to index.html for SPA routing (catch-all after API routes)
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(webDistPath, 'index.html'));
  } else {
    next();
  }
});

const server = app.listen(PORT, 'localhost', () => {
  console.log(`Mission Control server running on http://localhost:${PORT}`);
});

// WebSocket for live updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
  
  // Send initial state
  ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});
