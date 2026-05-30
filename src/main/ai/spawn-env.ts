import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

// Build an augmented PATH that includes common CLI install locations.
// macOS apps launched outside a terminal get a minimal PATH that misses
// Homebrew (/opt/homebrew/bin), NVM-managed Node bins, ~/.local/bin, etc.
function buildAugmentedPath(): string {
  const home = os.homedir()

  // Derive Node bin dir from the running executable so NVM paths are covered.
  const nodeBinDir = path.dirname(process.execPath)

  const extra = [
    path.join(home, '.local', 'bin'),   // claude-code default install
    path.join(home, '.npm-global', 'bin'),
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    nodeBinDir,
  ]

  const existing = (process.env.PATH ?? '').split(':').filter(Boolean)
  const merged = [...new Set([...extra, ...existing])]
  return merged.join(':')
}

export const SPAWN_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  PATH: buildAugmentedPath(),
  NO_COLOR: '1',
}

export function resolveCommand(cmd: string): string | null {
  try {
    const result = execFileSync('which', [cmd], {
      env: SPAWN_ENV,
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return result.trim() || null
  } catch {
    return null
  }
}
