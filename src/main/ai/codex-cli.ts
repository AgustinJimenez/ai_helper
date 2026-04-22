import { spawn } from 'node:child_process'
import type { AIBackend } from './backend'
import type { Message } from '../../shared/types'

export class CodexCliBackend implements AIBackend {
  async sendMessage(
    systemPrompt: string,
    messages: Message[],
    onChunk: (text: string) => void
  ): Promise<void> {
    const lastUserMessage = messages.filter((m) => m.role === 'user').at(-1)
    const prompt = `${systemPrompt}\n\n${lastUserMessage?.content ?? ''}`

    return new Promise((resolve, reject) => {
      const proc = spawn('codex', [prompt], {
        stdio: ['ignore', 'pipe', 'pipe']
      })

      proc.stdout.on('data', (data: Buffer) => onChunk(data.toString()))
      proc.on('close', (code) => {
        if (code === 0) {
          resolve()
          return
        }

        reject(new Error(`codex CLI exited with code ${code}`))
      })
      proc.on('error', (err) =>
        reject(new Error(`codex CLI not found. Install with: npm i -g @openai/codex\n${err.message}`))
      )
    })
  }
}
