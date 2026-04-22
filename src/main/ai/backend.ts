import type { Message, BackendType } from '../../shared/types'
import { ClaudeSdkBackend } from './claude-sdk'
import { ClaudeCliBackend } from './claude-cli'
import { CodexCliBackend } from './codex-cli'

export interface AIBackend {
  sendMessage(
    systemPrompt: string,
    messages: Message[],
    onChunk: (text: string) => void
  ): Promise<void>
  resetSession?(): void
}

export function getBackend(type: BackendType, apiKey: string | null): AIBackend {
  switch (type) {
    case 'claude-cli': return new ClaudeCliBackend()
    case 'codex-cli':  return new CodexCliBackend()
    default:           return new ClaudeSdkBackend(apiKey ?? '')
  }
}
