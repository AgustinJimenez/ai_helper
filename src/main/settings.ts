import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { isBackendType, isInterviewMode } from '../shared/types'
import type { Settings } from '../shared/types'

const settingsPath = (): string => path.join(app.getPath('userData'), 'settings.json')

const defaults: Settings = {
  backend: 'claude-cli',
  interviewMode: 'coding',
  overlayOpacity: 0.95
}

export function loadSettings(): Settings {
  try {
    const p = settingsPath()
    if (fs.existsSync(p)) {
      const storedSettings = sanitizeSettings(JSON.parse(fs.readFileSync(p, 'utf8')))
      return { ...defaults, ...storedSettings }
    }
  } catch {
    // ignore, return defaults
  }
  return { ...defaults }
}

export function saveSettings(partial: Partial<Settings>): void {
  const current = loadSettings()
  const next = sanitizeSettings({ ...current, ...partial })
  fs.writeFileSync(settingsPath(), JSON.stringify({ ...defaults, ...next }, null, 2))
}

function sanitizeSettings(value: unknown): Partial<Settings> {
  if (!value || typeof value !== 'object') {
    return {}
  }

  const raw = value as Record<string, unknown>
  const next: Partial<Settings> = {}

  if (isBackendType(raw.backend)) {
    next.backend = raw.backend
  }

  if (isInterviewMode(raw.interviewMode)) {
    next.interviewMode = raw.interviewMode
  }

  if (typeof raw.overlayOpacity === 'number' && raw.overlayOpacity >= 0 && raw.overlayOpacity <= 1) {
    next.overlayOpacity = raw.overlayOpacity
  }

  return next
}
