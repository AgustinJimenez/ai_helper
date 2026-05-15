import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { getDefaultPromptTemplates } from './ai/prompts'
import { isBackendType, isInterviewMode } from '../shared/types'
import type { PromptTemplate, Settings, SettingsUpdate } from '../shared/types'

const settingsPath = (): string => path.join(app.getPath('userData'), 'settings.json')

const defaults: Settings = {
  backend: 'claude-cli',
  selectedPromptTemplateId: 'coding',
  promptTemplates: getDefaultPromptTemplates(),
  overlayOpacity: 0.95
}

export function loadSettings(): Settings {
  try {
    const p = settingsPath()
    if (fs.existsSync(p)) {
      const storedSettings = sanitizeSettingsUpdate(JSON.parse(fs.readFileSync(p, 'utf8')))
      return normalizeSettings({ ...defaults, ...storedSettings })
    }
  } catch {
    // ignore, return defaults
  }
  return normalizeSettings(defaults)
}

export function saveSettings(partial: SettingsUpdate): void {
  const current = loadSettings()
  const next = normalizeSettings({ ...current, ...sanitizeSettingsUpdate(partial) })
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2))
}

export function sanitizeSettingsUpdate(value: unknown): SettingsUpdate {
  if (!value || typeof value !== 'object') {
    return {}
  }

  const raw = value as Record<string, unknown>
  const next: Partial<Settings> = {}

  if (isBackendType(raw.backend)) {
    next.backend = raw.backend
  }

  if (typeof raw.selectedPromptTemplateId === 'string' && raw.selectedPromptTemplateId.trim()) {
    next.selectedPromptTemplateId = raw.selectedPromptTemplateId.trim()
  } else if (isInterviewMode(raw.interviewMode)) {
    next.selectedPromptTemplateId = raw.interviewMode
  }

  const promptTemplates = sanitizePromptTemplates(raw.promptTemplates)
  if (promptTemplates.length > 0) {
    next.promptTemplates = promptTemplates
  }

  if (typeof raw.overlayOpacity === 'number' && raw.overlayOpacity >= 0 && raw.overlayOpacity <= 1) {
    next.overlayOpacity = raw.overlayOpacity
  }

  return next
}

function sanitizePromptTemplates(value: unknown): PromptTemplate[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seenIds = new Set<string>()
  const next: PromptTemplate[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const raw = item as Record<string, unknown>
    const id = typeof raw.id === 'string' ? raw.id.trim() : ''
    const name = typeof raw.name === 'string' ? raw.name.trim() : ''
    const prompt = typeof raw.prompt === 'string' ? raw.prompt.trim() : ''

    if (!id || !name || !prompt || seenIds.has(id)) {
      continue
    }

    seenIds.add(id)
    next.push({ id, name, prompt })
  }

  return next
}

function normalizeSettings(value: Partial<Settings>): Settings {
  const promptTemplates = value.promptTemplates && value.promptTemplates.length > 0
    ? value.promptTemplates
    : getDefaultPromptTemplates()
  const selectedPromptTemplateId = promptTemplates.some((template) => template.id === value.selectedPromptTemplateId)
    ? value.selectedPromptTemplateId!
    : promptTemplates[0].id

  return {
    backend: value.backend ?? defaults.backend,
    selectedPromptTemplateId,
    promptTemplates,
    overlayOpacity: value.overlayOpacity ?? defaults.overlayOpacity
  }
}
