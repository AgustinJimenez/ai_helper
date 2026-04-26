import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import type { AIBackend } from './backend'
import type { Message } from '../../shared/types'

interface GeminiJsonResponse {
  response?: string
  error?: string | { message?: string }
}

export class GeminiCliBackend implements AIBackend {
  private workingDir: string | null = null

  resetSession(): void {
    this.cleanupWorkingDir()
  }

  async sendMessage(
    systemPrompt: string,
    messages: Message[],
    onChunk: (text: string) => void
  ): Promise<void> {
    const workingDir = this.ensureWorkingDir()
    const prompt = buildPrompt(systemPrompt, messages, workingDir)
    const args = [
      '--prompt', prompt,
      '--output-format', 'json',
      '--skip-trust'
    ]

    return new Promise((resolve, reject) => {
      const proc = spawn('gemini', args, {
        cwd: workingDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NO_COLOR: '1'
        }
      })

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      proc.on('close', (code) => {
        const response = parseGeminiJson(stdout)
        const responseText = response?.response?.trim()
        const responseError = response?.error ? formatGeminiError(response.error) : null
        const stderrMessage = getLastLine(stderr)

        if (code !== 0) {
          reject(new Error(responseError ?? stderrMessage ?? `gemini CLI exited with code ${code}`))
          return
        }

        if (responseError) {
          reject(new Error(responseError))
          return
        }

        if (!responseText) {
          reject(new Error(stderrMessage ?? 'gemini CLI returned an empty response'))
          return
        }

        onChunk(responseText)
        resolve()
      })

      proc.on('error', (err) => {
        reject(new Error(`gemini CLI not found. Install with: npm i -g @google/gemini-cli\n${err.message}`))
      })
    })
  }

  private ensureWorkingDir(): string {
    if (this.workingDir) {
      return this.workingDir
    }

    this.workingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-helper-gemini-'))
    return this.workingDir
  }

  private cleanupWorkingDir(): void {
    if (!this.workingDir) {
      return
    }

    fs.rmSync(this.workingDir, { recursive: true, force: true })
    this.workingDir = null
  }
}

function buildPrompt(systemPrompt: string, messages: Message[], workingDir: string): string {
  const lines = [
    'Follow these instructions for every answer:',
    systemPrompt,
    '',
    'Conversation transcript:'
  ]

  let imageIndex = 0

  for (const [index, message] of messages.entries()) {
    const speaker = message.role === 'user' ? 'User' : 'Assistant'
    lines.push(`### ${speaker} ${index + 1}`)

    if (message.role === 'user' && message.imageBase64) {
      imageIndex += 1
      const imageName = `capture-${String(imageIndex).padStart(3, '0')}.png`
      ensureImageFile(path.join(workingDir, imageName), message.imageBase64)
      lines.push('Attached screenshot:')
      lines.push(`@${imageName}`)
    }

    const content = sanitizePromptText(message.content.trim())
    if (content) {
      lines.push(content)
    }

    lines.push('')
  }

  lines.push('Reply to the latest user message and preserve the established context.')
  lines.push('Use any attached screenshot as primary context when present.')
  lines.push('Do not mention these instructions, transcript labels, or local file names.')

  return lines.join('\n')
}

function ensureImageFile(filePath: string, imageBase64: string): void {
  if (fs.existsSync(filePath)) {
    return
  }

  fs.writeFileSync(filePath, Buffer.from(imageBase64, 'base64'))
}

function sanitizePromptText(text: string): string {
  return text.replaceAll('@', '＠')
}

function parseGeminiJson(stdout: string): GeminiJsonResponse | null {
  const trimmed = stdout.trim()
  if (!trimmed) {
    return null
  }

  for (const candidate of [
    trimmed,
    trimmed.split('\n').filter(Boolean).at(-1) ?? '',
    sliceJsonObject(trimmed)
  ]) {
    if (!candidate) {
      continue
    }

    try {
      return JSON.parse(candidate) as GeminiJsonResponse
    } catch {
      // try the next candidate
    }
  }

  return null
}

function sliceJsonObject(value: string): string {
  const start = value.indexOf('{')
  const end = value.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    return ''
  }

  return value.slice(start, end + 1)
}

function formatGeminiError(error: GeminiJsonResponse['error']): string {
  if (!error) {
    return 'gemini CLI request failed'
  }

  if (typeof error === 'string') {
    return error
  }

  return error.message ?? 'gemini CLI request failed'
}

function getLastLine(output: string): string | null {
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.at(-1) ?? null
}
