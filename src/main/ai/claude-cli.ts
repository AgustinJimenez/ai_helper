import { spawn } from 'node:child_process'
import type { AIBackend } from './backend'
import type { Message } from '../../shared/types'

export class ClaudeCliBackend implements AIBackend {
  private sessionId: string | null = null

  resetSession(): void {
    this.sessionId = null
  }

  async sendMessage(
    systemPrompt: string,
    messages: Message[],
    onChunk: (text: string) => void
  ): Promise<void> {
    // Only send the latest message — previous turns are in the persisted session
    const latest = messages[messages.length - 1]
    const inputMsg = buildMessage(latest)

    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--input-format', 'stream-json',
      '--verbose',
      '--include-partial-messages',
      '--permission-mode', 'bypassPermissions',
    ]

    if (this.sessionId) {
      args.push('--resume', this.sessionId)
    } else {
      args.push('--system-prompt', systemPrompt)
    }

    return new Promise((resolve, reject) => {
      const proc = spawn('claude', args, { stdio: ['pipe', 'pipe', 'pipe'] })

      proc.stdin.on('error', () => {})
      proc.stdin.write(JSON.stringify(inputMsg) + '\n')
      proc.stdin.end()

      let buffer = ''
      proc.stdout.on('data', (data: Buffer) => {
        buffer += data.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line)

            // Capture session ID for subsequent turns
            if (!this.sessionId && event.session_id) {
              this.sessionId = event.session_id
            }

            // Stream text deltas
            if (
              event.type === 'stream_event' &&
              event.event?.type === 'content_block_delta' &&
              event.event?.delta?.type === 'text_delta'
            ) {
              onChunk(event.event.delta.text)
            }
          } catch {
            // ignore malformed lines
          }
        }
      })

      proc.stderr.on('data', (data: Buffer) => {
        const msg = data.toString().trim()
        if (msg) console.error('[claude-cli]', msg)
      })

      proc.on('close', (code) => {
        if (code === 0) {
          resolve()
          return
        }

        reject(new Error(`claude exited with code ${code}`))
      })

      proc.on('error', (err) => {
        reject(new Error(`claude CLI not found — install Claude Code: https://claude.ai/download\n${err.message}`))
      })
    })
  }
}

function buildMessage(msg: Message): object {
  if (msg.imageBase64 && msg.role === 'user') {
    return {
      type: 'user',
      message: {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: msg.imageBase64 }
          },
          { type: 'text', text: msg.content }
        ]
      }
    }
  }
  return {
    type: msg.role === 'user' ? 'user' : 'assistant',
    message: {
      role: msg.role,
      content: msg.content
    }
  }
}
