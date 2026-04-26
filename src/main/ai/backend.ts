import type { Message, BackendType } from '../../shared/types'
import { ClaudeCliBackend } from './claude-cli'
import { CodexCliBackend } from './codex-cli'
import { GeminiCliBackend } from './gemini-cli'

export interface AIBackend {
  sendMessage(
    systemPrompt: string,
    messages: Message[],
    onChunk: (text: string) => void
  ): Promise<void>
  resetSession?(): void
}

export function getBackend(type: BackendType): AIBackend {
  switch (type) {
    case 'claude-cli': return new ClaudeCliBackend()
    case 'codex-cli': return new CodexCliBackend()
    case 'gemini-cli': return new GeminiCliBackend()
  }
}
