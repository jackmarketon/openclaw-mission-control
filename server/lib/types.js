/**
 * @typedef {'coding' | 'research' | 'testing' | 'deployment' | 'chat' | 'unknown'} SessionType
 * @typedef {'active' | 'idle' | 'completed'} SessionStatus
 * @typedef {'netlify' | 'vercel' | 'other'} PreviewProvider
 * @typedef {'open' | 'closed' | 'merged'} PRState
 * @typedef {'building' | 'ready' | 'error'} PreviewStatus
 */

/**
 * @typedef {Object} PR
 * @property {number} number - PR number
 * @property {string} url - Full PR URL
 * @property {string} [title] - PR title (if fetched)
 * @property {PRState} [state] - PR state
 */

/**
 * @typedef {Object} Preview
 * @property {string} url - Deploy preview URL
 * @property {PreviewProvider} provider - Preview provider
 * @property {PreviewStatus} [status] - Build status
 */

/**
 * @typedef {Object} Linear
 * @property {string} ticketId - Linear ticket identifier (e.g., PER-171)
 * @property {string} ticketUrl - Full Linear ticket URL
 * @property {string} [ticketTitle] - Ticket title (if fetched)
 */

/**
 * Session metadata tracked by Mission Control
 * @typedef {Object} SessionMetadata
 * @property {string} id - Session UUID
 * @property {string} agentId - Agent ID
 * @property {string} [repo] - Repository name
 * @property {string} [repoOwner] - Repository owner/org
 * @property {string} [branch] - Current branch
 * @property {PR} [pr] - Pull request info
 * @property {Preview} [preview] - Deploy preview info
 * @property {SessionType} type - Session type
 * @property {SessionStatus} status - Session status
 * @property {string} createdAt - ISO timestamp of first message
 * @property {string} lastActive - ISO timestamp of last message
 * @property {number} messageCount - Total messages in session
 * @property {number} toolCalls - Total tool invocations
 * @property {Linear} [linear] - Linear ticket integration
 * @property {string} [workspace] - Workspace path (if not default)
 * @property {string} cwd - Working directory at session start
 */

/**
 * Persistent cache structure
 * @typedef {Object} CacheSnapshot
 * @property {number} version - Cache format version
 * @property {string} lastUpdated - ISO timestamp of last cache update
 * @property {Object<string, SessionMetadata>} sessions - Map of sessionId -> metadata
 */

/**
 * WebSocket session update message
 * @typedef {Object} SessionUpdate
 * @property {'session_update'} type - Message type
 * @property {string} sessionId - Updated session ID
 * @property {Partial<SessionMetadata>} changes - Changed fields
 * @property {string} timestamp - ISO timestamp of update
 */

export {};
