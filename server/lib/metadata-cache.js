import fs from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { extractRepoAndBranch, extractPR, inferSessionType } from './extractors.js';

/** @typedef {import('./types.js').SessionMetadata} SessionMetadata */
/** @typedef {import('./types.js').CacheSnapshot} CacheSnapshot */

const CACHE_VERSION = 1;
const OPENCLAW_DIR = join(homedir(), '.openclaw');
const CACHE_DIR = join(OPENCLAW_DIR, 'mission-control');
const CACHE_FILE = join(CACHE_DIR, 'cache.json');

/**
 * Session metadata cache
 * Aggregates session data for fast dashboard queries
 */
export class MetadataCache {
  constructor() {
    /** @type {Map<string, SessionMetadata>} */
    this.sessions = new Map();
    this.lastUpdated = null;
  }

  /**
   * Initialize cache from disk or rebuild from session files
   */
  async init() {
    if (await this._loadFromDisk()) {
      console.log(`Loaded ${this.sessions.size} sessions from cache`);
      return;
    }

    console.log('Cache not found or stale, rebuilding...');
    await this.rebuild();
  }

  /**
   * Rebuild cache by scanning all session files
   */
  async rebuild() {
    this.sessions.clear();

    const agentsDir = join(OPENCLAW_DIR, 'agents');
    if (!existsSync(agentsDir)) {
      console.warn('No agents directory found at:', agentsDir);
      return;
    }

    const agents = await fs.readdir(agentsDir);

    for (const agentId of agents) {
      const sessionsDir = join(agentsDir, agentId, 'sessions');
      if (!existsSync(sessionsDir)) continue;

      const files = await fs.readdir(sessionsDir);
      const sessionFiles = files.filter(f => f.endsWith('.jsonl') && !f.endsWith('.lock'));

      for (const file of sessionFiles) {
        const sessionId = basename(file, '.jsonl');
        const filePath = join(sessionsDir, file);

        try {
          const metadata = await this._parseSessionFile(filePath, sessionId, agentId);
          if (metadata) {
            this.sessions.set(sessionId, metadata);
          }
        } catch (err) {
          console.error(`Failed to parse session ${sessionId}:`, err.message);
        }
      }
    }

    this.lastUpdated = new Date().toISOString();
    await this._saveToDisk();
    console.log(`Rebuilt cache with ${this.sessions.size} sessions`);
  }

  /**
   * Parse a session JSONL file and extract metadata
   * @param {string} filePath 
   * @param {string} sessionId 
   * @param {string} agentId 
   * @returns {Promise<SessionMetadata|null>}
   */
  async _parseSessionFile(filePath, sessionId, agentId) {
    const content = await fs.readFile(filePath, 'utf-8');
    const rawLines = content.trim().split('\n').filter(l => l.trim());

    if (rawLines.length === 0) return null;

    // Parse all lines
    const lines = [];
    for (const raw of rawLines) {
      try {
        lines.push(JSON.parse(raw));
      } catch (err) {
        // Skip malformed lines
        continue;
      }
    }

    if (lines.length === 0) return null;

    // First line must be session metadata
    const first = lines[0];
    if (first.type !== 'session') {
      console.warn(`Session ${sessionId} has invalid first line`);
      return null;
    }

    let messageCount = 0;
    let toolCalls = 0;
    let lastTimestamp = first.timestamp;

    // Count messages and tool calls
    for (const line of lines.slice(1)) {
      if (line.type === 'message') {
        messageCount++;
        if (line.timestamp) lastTimestamp = line.timestamp;

        // Count tool calls from assistant messages
        if (line.message?.role === 'assistant' && line.message.content) {
          const toolUses = line.message.content.filter(c => c.type === 'toolCall');
          toolCalls += toolUses.length;
        }
      }
    }

    // Extract repo, branch, PR metadata
    const { repo, repoOwner, branch } = extractRepoAndBranch(lines);
    const pr = extractPR(lines);

    // Infer session type
    const type = inferSessionType(toolCalls, lines);

    // Determine status based on last activity
    const lastActiveMs = new Date(lastTimestamp).getTime();
    const nowMs = Date.now();
    const minutesAgo = (nowMs - lastActiveMs) / (1000 * 60);

    let status = 'completed';
    if (minutesAgo < 5) status = 'active';
    else if (minutesAgo < 60) status = 'idle';

    return {
      id: sessionId,
      agentId,
      repo,
      repoOwner,
      branch,
      pr: Object.keys(pr).length > 0 ? pr : undefined,
      type,
      status,
      createdAt: first.timestamp,
      lastActive: lastTimestamp,
      messageCount,
      toolCalls,
      cwd: first.cwd || OPENCLAW_DIR,
    };
  }

  /**
   * Get all sessions
   * @returns {SessionMetadata[]}
   */
  getSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session by ID
   * @param {string} sessionId 
   * @returns {SessionMetadata|undefined}
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Update session metadata
   * @param {string} sessionId 
   * @param {Partial<SessionMetadata>} changes 
   */
  updateSession(sessionId, changes) {
    const existing = this.sessions.get(sessionId);
    if (!existing) return;

    this.sessions.set(sessionId, { ...existing, ...changes });
  }

  /**
   * Load cache from disk
   * @returns {Promise<boolean>} true if loaded successfully
   */
  async _loadFromDisk() {
    if (!existsSync(CACHE_FILE)) return false;

    try {
      const content = await fs.readFile(CACHE_FILE, 'utf-8');
      /** @type {CacheSnapshot} */
      const snapshot = JSON.parse(content);

      if (snapshot.version !== CACHE_VERSION) {
        console.log('Cache version mismatch, will rebuild');
        return false;
      }

      // Check if cache is stale (>24h old)
      const cacheAge = Date.now() - new Date(snapshot.lastUpdated).getTime();
      if (cacheAge > 24 * 60 * 60 * 1000) {
        console.log('Cache is stale (>24h), will rebuild');
        return false;
      }

      this.sessions = new Map(Object.entries(snapshot.sessions));
      this.lastUpdated = snapshot.lastUpdated;
      return true;
    } catch (err) {
      console.error('Failed to load cache:', err.message);
      return false;
    }
  }

  /**
   * Save cache to disk
   */
  async _saveToDisk() {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });

      /** @type {CacheSnapshot} */
      const snapshot = {
        version: CACHE_VERSION,
        lastUpdated: this.lastUpdated || new Date().toISOString(),
        sessions: Object.fromEntries(this.sessions.entries()),
      };

      await fs.writeFile(CACHE_FILE, JSON.stringify(snapshot, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save cache:', err.message);
    }
  }
}
