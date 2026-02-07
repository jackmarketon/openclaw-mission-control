import fs from 'fs/promises';
import { watch, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { EventEmitter } from 'events';

/** @typedef {import('./types.js').SessionMetadata} SessionMetadata */

const OPENCLAW_DIR = join(homedir(), '.openclaw');
const AGENTS_DIR = join(OPENCLAW_DIR, 'agents');

/**
 * Session file monitor
 * Watches for changes to session JSONL files and emits events
 */
export class SessionMonitor extends EventEmitter {
  constructor(cache) {
    super();
    this.cache = cache;
    this.watchers = new Map();
    this.pollingInterval = null;
    this.lastSeenSizes = new Map();
  }

  /**
   * Start monitoring session files
   */
  async start() {
    if (!existsSync(AGENTS_DIR)) {
      console.warn('Agents directory not found:', AGENTS_DIR);
      return;
    }

    // Set up watchers for each agent's sessions directory
    const agents = await fs.readdir(AGENTS_DIR);

    for (const agentId of agents) {
      const sessionsDir = join(AGENTS_DIR, agentId, 'sessions');
      if (!existsSync(sessionsDir)) continue;

      try {
        this._watchDirectory(sessionsDir, agentId);
      } catch (err) {
        console.error(`Failed to watch ${sessionsDir}:`, err.message);
      }
    }

    // Fallback: poll for new agent directories every 30s
    this.pollingInterval = setInterval(() => this._checkForNewAgents(), 30000);

    console.log('Session monitor started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    console.log('Session monitor stopped');
  }

  /**
   * Watch a sessions directory for changes
   */
  _watchDirectory(sessionsDir, agentId) {
    const watcher = watch(sessionsDir, async (eventType, filename) => {
      if (!filename || !filename.endsWith('.jsonl') || filename.endsWith('.lock')) {
        return;
      }

      const sessionId = filename.replace('.jsonl', '');
      const filePath = join(sessionsDir, filename);

      // Check if file was deleted
      if (!existsSync(filePath)) {
        this._handleSessionDeleted(sessionId, agentId);
        return;
      }

      // Check if this is a new session or an update
      const isNew = !this.cache.getSession(sessionId);

      if (isNew) {
        await this._handleNewSession(filePath, sessionId, agentId);
      } else {
        await this._handleSessionUpdate(filePath, sessionId, agentId);
      }
    });

    this.watchers.set(sessionsDir, watcher);
    console.log(`Watching: ${sessionsDir}`);
  }

  /**
   * Handle new session file
   */
  async _handleNewSession(filePath, sessionId, agentId) {
    try {
      const metadata = await this.cache._parseSessionFile(filePath, sessionId, agentId);
      if (metadata) {
        this.cache.sessions.set(sessionId, metadata);
        this.emit('session:new', metadata);
        console.log(`New session: ${agentId}/${sessionId}`);
      }
    } catch (err) {
      console.error(`Failed to parse new session ${sessionId}:`, err.message);
    }
  }

  /**
   * Handle session file update
   */
  async _handleSessionUpdate(filePath, sessionId, agentId) {
    try {
      // Check if file actually changed (avoid spurious events)
      const stats = await fs.stat(filePath);
      const lastSize = this.lastSeenSizes.get(sessionId);

      if (lastSize === stats.size) {
        return; // No change
      }

      this.lastSeenSizes.set(sessionId, stats.size);

      // Re-parse session to get updated metadata
      const metadata = await this.cache._parseSessionFile(filePath, sessionId, agentId);
      if (metadata) {
        const existing = this.cache.getSession(sessionId);
        this.cache.sessions.set(sessionId, metadata);

        // Emit changes
        if (existing) {
          const changes = this._diffMetadata(existing, metadata);
          if (Object.keys(changes).length > 0) {
            this.emit('session:update', { sessionId, changes, metadata });
            console.log(`Updated session: ${agentId}/${sessionId}`, changes);
          }
        }
      }
    } catch (err) {
      console.error(`Failed to update session ${sessionId}:`, err.message);
    }
  }

  /**
   * Handle session deletion
   */
  _handleSessionDeleted(sessionId, agentId) {
    const metadata = this.cache.getSession(sessionId);
    if (metadata) {
      this.cache.sessions.delete(sessionId);
      this.lastSeenSizes.delete(sessionId);
      this.emit('session:deleted', { sessionId, metadata });
      console.log(`Deleted session: ${agentId}/${sessionId}`);
    }
  }

  /**
   * Check for new agent directories (polling fallback)
   */
  async _checkForNewAgents() {
    try {
      const agents = await fs.readdir(AGENTS_DIR);

      for (const agentId of agents) {
        const sessionsDir = join(AGENTS_DIR, agentId, 'sessions');
        if (!existsSync(sessionsDir)) continue;

        // If not already watching, start watching
        if (!this.watchers.has(sessionsDir)) {
          this._watchDirectory(sessionsDir, agentId);
        }
      }
    } catch (err) {
      console.error('Failed to check for new agents:', err.message);
    }
  }

  /**
   * Compute diff between old and new metadata
   */
  _diffMetadata(old, updated) {
    const changes = {};

    for (const key of Object.keys(updated)) {
      if (JSON.stringify(old[key]) !== JSON.stringify(updated[key])) {
        changes[key] = updated[key];
      }
    }

    return changes;
  }
}
