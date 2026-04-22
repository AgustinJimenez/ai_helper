import { app, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { Settings } from '../shared/types'

const settingsPath = (): string => path.join(app.getPath('userData'), 'settings.json')
const apiKeyPath = (): string => path.join(app.getPath('userData'), 'api-key.enc')

const defaults: Settings = {
  backend: 'claude-cli',
  model: 'claude-sonnet-4-6',
  interviewMode: 'coding',
  overlayOpacity: 0.95
}

export function loadSettings(): Settings {
  try {
    const p = settingsPath()
    if (fs.existsSync(p)) {
      return { ...defaults, ...JSON.parse(fs.readFileSync(p, 'utf8')) }
    }
  } catch {
    // ignore, return defaults
  }
  return { ...defaults }
}

export function saveSettings(partial: Partial<Settings>): void {
  const current = loadSettings()
  fs.writeFileSync(settingsPath(), JSON.stringify({ ...current, ...partial }, null, 2))
}

export function saveApiKey(key: string): void {
  const p = apiKeyPath()
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(p, safeStorage.encryptString(key))
  } else {
    fs.writeFileSync(p, key, 'utf8')
  }
}

export function loadApiKey(): string | null {
  // 1. Our stored (encrypted) key
  const p = apiKeyPath()
  if (fs.existsSync(p)) {
    try {
      const data = fs.readFileSync(p)
      const key = safeStorage.isEncryptionAvailable()
        ? safeStorage.decryptString(data)
        : data.toString('utf8')
      if (key) return key
    } catch {
      // ignore invalid stored key and fall back to environment configuration
    }
  }

  // 2. Env var — already set if user has Claude Code or Anthropic CLI configured
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY

  return null
}
