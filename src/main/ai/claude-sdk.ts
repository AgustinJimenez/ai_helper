import Anthropic from '@anthropic-ai/sdk'
import type { AIBackend } from './backend'
import type { Message } from '../../shared/types'

export class ClaudeSdkBackend implements AIBackend {
  private client: Anthropic

  constructor(apiKey?: string) {
    // If no key provided, SDK reads ANTHROPIC_API_KEY from env automatically
    this.client = apiKey ? new Anthropic({ apiKey }) : new Anthropic()
  }

  async sendMessage(
    systemPrompt: string,
    messages: Message[],
    onChunk: (text: string) => void
  ): Promise<void> {
    const apiMessages: Anthropic.MessageParam[] = messages.map((msg) => {
      if (msg.imageBase64 && msg.role === 'user') {
        return {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: msg.imageBase64
              }
            },
            { type: 'text', text: msg.content }
          ]
        }
      }
      return { role: msg.role, content: msg.content }
    })

    const stream = this.client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: apiMessages
    })

    stream.on('text', onChunk)
    await stream.finalMessage()
  }
}
