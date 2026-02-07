// Mission Control Server
// Monitors OpenClaw sessions and serves dashboard API

import express from 'express';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.MISSION_CONTROL_PORT || 3030;
const app = express();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// API: List sessions (placeholder)
app.get('/api/sessions', (req, res) => {
  res.json([
    {
      id: 'example-session',
      agent: 'lowlight',
      type: 'coding',
      repo: 'openclaw-mission-control',
      branch: 'main',
      status: 'active',
      lastActive: new Date().toISOString()
    }
  ]);
});

// Serve static web UI
const webDistPath = join(__dirname, '../web/dist');
app.use(express.static(webDistPath));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(join(webDistPath, 'index.html'));
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
