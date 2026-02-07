/**
 * Metadata extractors for session JSONL parsing
 * Extract repo, branch, PR, preview URLs from tool calls
 */

/**
 * Extract repo and branch information from session messages
 * @param {Array} lines - Parsed JSONL lines
 * @returns {{repo?: string, repoOwner?: string, branch?: string}}
 */
export function extractRepoAndBranch(lines) {
  let repo, repoOwner, branch;

  for (const line of lines) {
    if (line.type !== 'message' || !line.message) continue;

    const msg = line.message;

    // Look for assistant tool calls (exec, gh, etc.)
    if (msg.role === 'assistant' && msg.content) {
      for (const item of msg.content) {
        if (item.type === 'toolCall' && item.name === 'exec' && item.arguments?.command) {
          const cmd = item.arguments.command;

          // Detect git worktree add ../path branch-name
          const worktreeMatch = cmd.match(/git\s+worktree\s+add\s+(?:\.\.\/)?([^\s]+)\s+([^\s&|;]+)/);
          if (worktreeMatch) {
            const [, repoPath, branchName] = worktreeMatch;
            
            // Only use branch if it looks valid
            if (branchName && !branchName.startsWith('-') && branchName.length > 1) {
              branch = branchName;
            }

            // Extract repo from path (e.g., ../openclaw-mission-control → openclaw-mission-control)
            const repoMatch = repoPath.match(/([^\/]+)$/);
            if (repoMatch && !repo) {
              const extracted = repoMatch[1].replace(/^\.\.\//, '');
              // Filter out common path components that aren't repos
              if (extracted && extracted !== 'Code' && extracted !== 'workspace') {
                repo = extracted;
              }
            }
          }

          // Detect git checkout -b <branch>
          const checkoutMatch = cmd.match(/git\s+checkout\s+-b\s+([^\s&|;]+)/);
          if (checkoutMatch) {
            const branchName = checkoutMatch[1];
            // Skip if it's just a flag or looks malformed
            if (branchName && !branchName.startsWith('-') && branchName.length > 1) {
              branch = branchName;
            }
          }

          // Detect cd ~/Code/{owner}/{repo}
          const cdMatch = cmd.match(/cd\s+~\/Code\/([^\/\s]+)\/([^\s&|;]+)/);
          if (cdMatch && !repo) {
            const [, owner, repoName] = cdMatch;
            // Validate repo name (alphanumeric + hyphens/underscores)
            if (repoName && /^[a-zA-Z0-9_-]+$/.test(repoName)) {
              repoOwner = owner;
              repo = repoName;
            }
          }
        }
      }
    }

    // Look for tool results with git status output
    if (msg.role === 'toolResult' && msg.toolName === 'exec' && msg.content) {
      const output = msg.content.map(c => c.text || '').join('\n');

      // Parse "On branch xyz" from git status
      const branchMatch = output.match(/On branch ([^\s\n]+)/);
      if (branchMatch && !branch) {
        branch = branchMatch[1];
      }

      // Parse git remote output (git@github.com:owner/repo.git)
      const remoteMatch = output.match(/git@github\.com:([^\/\s]+)\/([^\s\.]+)(?:\.git)?/);
      if (remoteMatch && !repo) {
        const [, owner, repoName] = remoteMatch;
        if (repoName && /^[a-zA-Z0-9_-]+$/.test(repoName)) {
          repoOwner = owner;
          repo = repoName;
        }
      }

      // Parse https GitHub URLs
      const httpsMatch = output.match(/https:\/\/github\.com\/([^\/\s]+)\/([^\s\.]+)/);
      if (httpsMatch && !repo) {
        const [, owner, repoName] = httpsMatch;
        const cleaned = repoName.replace(/\.git$/, '');
        if (cleaned && /^[a-zA-Z0-9_-]+$/.test(cleaned)) {
          repoOwner = owner;
          repo = cleaned;
        }
      }
    }
  }

  // Fallback: Try to extract from cwd in session start
  if (!repo && lines.length > 0) {
    const first = lines[0];
    if (first.type === 'session' && first.cwd) {
      const cwdMatch = first.cwd.match(/\/Code\/([^\/\s]+)\/([^\s\/]+)/);
      if (cwdMatch) {
        const [, owner, repoName] = cwdMatch;
        repoOwner = owner;
        repo = repoName;
      }
    }
  }

  return { repo, repoOwner, branch };
}

/**
 * Extract PR information from gh CLI tool calls
 * @param {Array} lines - Parsed JSONL lines
 * @returns {{number?: number, url?: string, title?: string, state?: string}}
 */
export function extractPR(lines) {
  let prNumber, prUrl, prTitle, prState;
  let lastPRCommand = null;

  for (const line of lines) {
    if (line.type !== 'message' || !line.message) continue;

    const msg = line.message;

    // Look for gh pr commands
    if (msg.role === 'assistant' && msg.content) {
      for (const item of msg.content) {
        if (item.type === 'toolCall' && item.name === 'exec' && item.arguments?.command) {
          const cmd = item.arguments.command;

          // Track last PR command to correlate with results
          if (cmd.includes('gh pr')) {
            lastPRCommand = { id: item.id, cmd };
          }

          // Detect gh pr create
          if (cmd.includes('gh pr create')) {
            // Mark that PR creation happened (we'll get URL from result)
          }

          // Detect gh pr view with number
          const viewMatch = cmd.match(/gh\s+pr\s+view\s+(\d+)/);
          if (viewMatch) {
            prNumber = parseInt(viewMatch[1], 10);
          }

          // Detect gh pr merge (PR is being merged)
          const mergeMatch = cmd.match(/gh\s+pr\s+merge\s+(\d+)/);
          if (mergeMatch) {
            prNumber = parseInt(mergeMatch[1], 10);
            prState = 'merged';
          }
        }
      }
    }

    // Look for tool results with PR URLs
    if (msg.role === 'toolResult' && msg.toolName === 'exec' && msg.content) {
      const output = msg.content.map(c => c.text || '').join('\n');

      // Parse PR URL from gh pr create output
      const urlMatch = output.match(/https:\/\/github\.com\/([^\/\s]+)\/([^\/\s]+)\/pull\/(\d+)/);
      if (urlMatch) {
        const [fullUrl, owner, repo, number] = urlMatch;
        prUrl = fullUrl;
        prNumber = parseInt(number, 10);

        // If this was a gh pr view command, try to extract title
        if (lastPRCommand?.cmd.includes('gh pr view')) {
          const titleMatch = output.match(/title:\s*(.+)/i);
          if (titleMatch) {
            prTitle = titleMatch[1].trim();
          }

          // Extract state from gh pr view
          const stateMatch = output.match(/state:\s*(OPEN|CLOSED|MERGED)/i);
          if (stateMatch && !prState) {
            prState = stateMatch[1].toLowerCase();
          }
        }
      }

      // Parse JSON output from gh pr view --json
      try {
        const jsonMatch = output.match(/\{[\s\S]*"number"[\s\S]*\}/);
        if (jsonMatch) {
          const prData = JSON.parse(jsonMatch[0]);
          if (prData.number) prNumber = prData.number;
          if (prData.url) prUrl = prData.url;
          if (prData.title) prTitle = prData.title;
          if (prData.state) prState = prData.state.toLowerCase();
        }
      } catch {
        // Not JSON or malformed, skip
      }
    }
  }

  // Construct URL if we have number but no URL (fallback)
  // This would require repo info from parent context — skip for now

  if (!prNumber) return {};

  // Build PR object with only defined fields
  const pr = { number: prNumber };
  if (prUrl) pr.url = prUrl;
  if (prTitle) pr.title = prTitle;
  if (prState) pr.state = prState;

  return pr;
}

/**
 * Infer session type from tool usage patterns
 * @param {number} toolCalls - Total tool invocations
 * @param {Array} lines - Parsed JSONL lines
 * @returns {'coding' | 'research' | 'testing' | 'deployment' | 'chat' | 'unknown'}
 */
export function inferSessionType(toolCalls, lines) {
  if (toolCalls === 0) return 'chat';

  let execCount = 0;
  let fileOpsCount = 0;
  let webCount = 0;
  let testCount = 0;
  let prCount = 0;

  for (const line of lines) {
    if (line.type !== 'message' || !line.message) continue;

    const msg = line.message;

    if (msg.role === 'assistant' && msg.content) {
      for (const item of msg.content) {
        if (item.type !== 'toolCall') continue;

        const name = item.name;
        const cmd = item.arguments?.command || '';

        if (name === 'exec') {
          execCount++;

          if (cmd.includes('npm test') || cmd.includes('vitest') || cmd.includes('jest') || cmd.includes('pytest')) {
            testCount++;
          }

          if (cmd.includes('gh pr')) {
            prCount++;
          }
        }

        if (name === 'Write' || name === 'Edit' || name === 'Read') {
          fileOpsCount++;
        }

        if (name === 'web_search' || name === 'web_fetch' || name === 'browser') {
          webCount++;
        }
      }
    }
  }

  // Heuristics
  if (testCount > 2) return 'testing';
  if (webCount > execCount && webCount > 3) return 'research';
  if (prCount > 0 && fileOpsCount > 5) return 'coding';
  if (execCount > 5 || fileOpsCount > 3) return 'coding';

  return 'unknown';
}
