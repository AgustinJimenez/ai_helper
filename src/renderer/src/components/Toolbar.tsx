import { useState, useRef, useEffect } from 'react'
import type { BackendType, PromptTemplate } from '../../../shared/types'
import { useWindowDrag } from '../lib/useWindowDrag'

interface Props {
  promptTemplates: PromptTemplate[]
  selectedPromptTemplateId: string
  backend: BackendType
  interactionEnabled: boolean
  onPromptTemplateChange: (promptTemplateId: string) => void
  onBackendChange: (backend: BackendType) => void
  onCapture: () => void
  onSettings: () => void
  onClear: () => void
  onQuit: () => void
  isCapturing: boolean
  hasMessages: boolean
}

const COUNTDOWN_START = 3

const BACKEND_OPTIONS: { value: BackendType; label: string }[] = [
  { value: 'claude-cli', label: 'Claude Code' },
  { value: 'codex-cli', label: 'Codex' },
  { value: 'gemini-cli', label: 'Gemini CLI' }
]

export function Toolbar({
  promptTemplates,
  selectedPromptTemplateId,
  backend,
  interactionEnabled,
  onPromptTemplateChange,
  onBackendChange,
  onCapture,
  onSettings,
  onClear,
  onQuit,
  isCapturing,
  hasMessages
}: Props): JSX.Element {
  const [countdown, setCountdown] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const handleDragMouseDown = useWindowDrag()

  const startCountdown = (): void => {
    if (isCapturing) return
    setCountdown(COUNTDOWN_START)
    let count = COUNTDOWN_START
    intervalRef.current = setInterval(() => {
      count--
      if (count <= 0) {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        setCountdown(null)
        onCapture()
      } else {
        setCountdown(count)
      }
    }, 1000)
  }

  const cancelCountdown = (): void => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setCountdown(null)
  }

  // Clean up on unmount
  useEffect(() => () => cancelCountdown(), [])

  const captureLabel = (): string => {
    if (isCapturing) return '⏳'
    if (countdown !== null) return String(countdown)
    return '📷'
  }

  return (
    <div
      className="flex items-center gap-0.5 px-2 py-1 border-b border-gray-700/50 flex-shrink-0"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <button
        onClick={() => { cancelCountdown(); onCapture() }}
        onMouseEnter={startCountdown}
        onMouseLeave={cancelCountdown}
        disabled={isCapturing}
        title="Capture screen — hover to auto-capture, or click (Cmd+Shift+Space)"
        className={`flex items-center justify-center px-2 py-0.5 rounded text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 w-8 ${
          countdown !== null ? 'bg-orange-500' : 'bg-blue-600 hover:bg-blue-500'
        }`}
      >
        {captureLabel()}
      </button>
      <select
        value={selectedPromptTemplateId}
        onChange={(event) => onPromptTemplateChange(event.target.value)}
        title="Prompt template"
        className="mx-1 w-40 bg-gray-800 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500/70 flex-shrink-0"
      >
        {promptTemplates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </select>
      <select
        value={backend}
        onChange={(event) => onBackendChange(event.target.value as BackendType)}
        title="AI provider"
        className="mx-1 w-36 bg-gray-800 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500/70 flex-shrink-0"
      >
        {BACKEND_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div
        title={interactionEnabled ? 'Drag to move' : undefined}
        onMouseDown={handleDragMouseDown}
        data-interaction-toggle="true"
        className="mx-1 flex min-w-0 flex-1 items-center rounded px-2 py-1 select-none hover:bg-gray-800/40"
      >
        <span className="sr-only">Drag to move window</span>
      </div>
      <button
        onClick={onClear}
        disabled={!hasMessages}
        title="Reset conversation (Cmd+Shift+X)"
        className="px-1.5 py-0.5 rounded text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ↺
      </button>
      <button
        onClick={onSettings}
        title={interactionEnabled ? 'Settings' : 'Hover Adjust first'}
        className="text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded text-xs hover:bg-gray-800 transition-colors"
      >
        ⚙
      </button>
      <button
        onClick={onQuit}
        title="Quit"
        className="text-gray-600 hover:text-red-400 px-1.5 py-0.5 rounded text-xs hover:bg-gray-800 transition-colors"
      >
        ⏻
      </button>
    </div>
  )
}
