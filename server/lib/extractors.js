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
            repoOwner = owner;
            repo = repoName;
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
        repoOwner = owner;
        repo = repoName;
      }

      // Parse https GitHub URLs
      const httpsMatch = output.match(/https:\/\/github\.com\/([^\/\s]+)\/([^\s\.]+)/);
      if (httpsMatch && !repo) {
        const [, owner, repoName] = httpsMatch;
        repoOwner = owner;
        repo = repoName.replace(/\.git$/, '');
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

  for (const line of lines) {
    if (line.type !== 'message' || !line.message) continue;

    const msg = line.message;

    // Look for gh pr commands
    if (msg.role === 'assistant' && msg.content) {
      for (const item of msg.content) {
        if (item.type === 'toolCall' && item.name === 'exec' && item.arguments?.command) {
          const cmd = item.arguments.command;

          // Detect gh pr create
          if (cmd.includes('gh pr create')) {
            // Will look for URL in tool result
          }

          // Detect gh pr view with number
          const viewMatch = cmd.match(/gh\s+pr\s+view\s+(\d+)/);
          if (viewMatch && !prNumber) {
            prNumber = parseInt(viewMatch[1], 10);
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
      }
    }
  }

  if (!prUrl && prNumber) {
    // Can't construct URL without repo info — will be filled in later if repo is known
  }

  return prNumber ? { number: prNumber, url: prUrl, title: prTitle, state: prState } : {};
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
