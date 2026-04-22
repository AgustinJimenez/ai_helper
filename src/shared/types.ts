export const INTERVIEW_MODES = ['coding', 'system-design', 'behavioral'] as const

export type InterviewMode = typeof INTERVIEW_MODES[number]

export const BACKEND_TYPES = ['claude-sdk', 'claude-cli', 'codex-cli'] as const

export type BackendType = typeof BACKEND_TYPES[number]

export type ScreenPermissionStatus = 'granted' | 'denied' | 'not-determined'

export interface Settings {
  backend: BackendType
  model: string
  interviewMode: InterviewMode
  overlayOpacity: number
}

export type SettingsUpdate = Partial<Settings> & {
  apiKey?: string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  imageBase64?: string
}

export function isInterviewMode(value: unknown): value is InterviewMode {
  return typeof value === 'string' && (INTERVIEW_MODES as readonly string[]).includes(value)
}

export function isBackendType(value: unknown): value is BackendType {
  return typeof value === 'string' && (BACKEND_TYPES as readonly string[]).includes(value)
}
