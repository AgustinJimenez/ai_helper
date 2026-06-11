import { useState, useRef, useEffect, useCallback } from 'react'
import type { BackendType, PromptTemplate, ResizeEdge } from '../../../shared/types'
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
  onZoomIn: () => void
  onZoomOut: () => void
  onMoveWindow: (dx: number, dy: number) => void
  onResizeWindow: (edge: ResizeEdge, dx: number, dy: number) => void
  isCapturing: boolean
  hasMessages: boolean
}

const COUNTDOWN_START = 3
const MOVE_STEP = 20
const RESIZE_STEP = 20
const MOVE_INITIAL_DELAY = 350
const MOVE_REPEAT_INTERVAL = 70

const BACKEND_OPTIONS: { value: BackendType; label: string }[] = [
  { value: 'claude-cli', label: 'Claude Code' },
  { value: 'codex-cli', label: 'Codex' },
  { value: 'gemini-cli', label: 'Gemini CLI' }
]

function useHoverCountdown(onTrigger: () => void): {
  countdown: number | null
  start: () => void
  cancel: () => void
} {
  const [countdown, setCountdown] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onTriggerRef = useRef(onTrigger)
  onTriggerRef.current = onTrigger

  const cancel = useCallback((): void => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setCountdown(null)
  }, [])

  const start = useCallback((): void => {
    setCountdown(COUNTDOWN_START)
    let count = COUNTDOWN_START
    intervalRef.current = setInterval(() => {
      count--
      if (count <= 0) {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        setCountdown(null)
        onTriggerRef.current()
      } else {
        setCountdown(count)
      }
    }, 1000)
  }, [])

  useEffect(() => () => cancel(), [cancel])

  return { countdown, start, cancel }
}

interface HoverRepeatButtonProps {
  onTrigger: () => void
  rotation: number
}

function HoverRepeatButton({ onTrigger, rotation }: HoverRepeatButtonProps): JSX.Element {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onTriggerRef = useRef(onTrigger)
  onTriggerRef.current = onTrigger

  const stop = useCallback((): void => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }, [])

  const start = useCallback((): void => {
    onTriggerRef.current()
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => onTriggerRef.current(), MOVE_REPEAT_INTERVAL)
    }, MOVE_INITIAL_DELAY)
  }, [])

  useEffect(() => () => stop(), [stop])

  return (
    <button
      onMouseEnter={start}
      onMouseLeave={stop}
      className="flex items-center justify-center rounded text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition-colors"
      style={{ width: 14, height: 14 }}
    >
      <svg
        width="8"
        height="8"
        viewBox="0 0 8 8"
        fill="none"
        style={{ transform: `rotate(${rotation}deg)` }}
        aria-hidden="true"
      >
        <path d="M1 5.5L4 2.5L7 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

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
  onZoomIn,
  onZoomOut,
  onMoveWindow,
  onResizeWindow,
  isCapturing,
  hasMessages
}: Props): JSX.Element {
  const handleDragMouseDown = useWindowDrag()
  const capture = useHoverCountdown(onCapture)
  const zoomIn = useHoverCountdown(onZoomIn)
  const zoomOut = useHoverCountdown(onZoomOut)

  const startCapture = (): void => {
    if (isCapturing) return
    capture.start()
  }

  const captureLabel = (): string => {
    if (isCapturing) return '⏳'
    if (capture.countdown !== null) return String(capture.countdown)
    return '📷'
  }

  return (
    <div
      className="flex flex-col px-2 py-1 border-b border-gray-700/50 flex-shrink-0 gap-0.5"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* Row 1: capture, selects, drag handle, utility buttons */}
      <div className="flex items-center gap-0.5 min-w-0">
        <button
          onClick={() => { capture.cancel(); onCapture() }}
          onMouseEnter={startCapture}
          onMouseLeave={capture.cancel}
          disabled={isCapturing}
          title="Capture screen — hover to auto-capture, or click (Cmd+Shift+Space)"
          className={`flex items-center justify-center px-2 py-0.5 rounded text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 w-8 ${
            capture.countdown !== null ? 'bg-orange-500' : 'bg-blue-600 hover:bg-blue-500'
          }`}
        >
          {captureLabel()}
        </button>
        <select
          value={selectedPromptTemplateId}
          onChange={(event) => onPromptTemplateChange(event.target.value)}
          title="Prompt template"
          className="mx-1 flex-1 min-w-0 bg-gray-800 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500/70 truncate"
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
          className="mx-1 flex-1 min-w-0 bg-gray-800 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500/70 truncate"
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
          className="px-1.5 py-0.5 rounded text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
        >
          ↺
        </button>
        <button
          onClick={onSettings}
          title={interactionEnabled ? 'Settings' : 'Hover Adjust first'}
          className="text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded text-xs hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          ⚙
        </button>
        <button
          onClick={onQuit}
          title="Quit"
          className="text-gray-600 hover:text-red-400 px-1.5 py-0.5 rounded text-xs hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          ⏻
        </button>
      </div>

      {/* Row 2: zoom + move d-pad + resize d-pad */}
      <div className="flex items-center gap-0.5">
        <button
          onMouseEnter={zoomOut.start}
          onMouseLeave={zoomOut.cancel}
          onClick={() => { zoomOut.cancel(); onZoomOut() }}
          title="Zoom out — hover 3s or click"
          className={`flex items-center justify-center px-1.5 py-0.5 rounded text-xs transition-colors flex-shrink-0 w-7 ${
            zoomOut.countdown !== null ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
          }`}
        >
          {zoomOut.countdown !== null ? (
            <span className="text-xs font-mono">{String(zoomOut.countdown)}</span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
              <line x1="3.5" y1="5.5" x2="7.5" y2="5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="9" y1="9" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          )}
        </button>
        <button
          onMouseEnter={zoomIn.start}
          onMouseLeave={zoomIn.cancel}
          onClick={() => { zoomIn.cancel(); onZoomIn() }}
          title="Zoom in — hover 3s or click"
          className={`flex items-center justify-center px-1.5 py-0.5 rounded text-xs transition-colors flex-shrink-0 w-7 ${
            zoomIn.countdown !== null ? 'bg-orange-500 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
          }`}
        >
          {zoomIn.countdown !== null ? (
            <span className="text-xs font-mono">{String(zoomIn.countdown)}</span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
              <line x1="3.5" y1="5.5" x2="7.5" y2="5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="5.5" y1="3.5" x2="5.5" y2="7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="9" y1="9" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          )}
        </button>
        {/* Move d-pad */}
        <div
          className="grid flex-shrink-0 mx-0.5"
          style={{ gridTemplateColumns: 'repeat(3, 14px)', gridTemplateRows: 'repeat(3, 14px)', gap: 1 }}
          title="Move window — hover to nudge"
        >
          <div />
          <HoverRepeatButton onTrigger={() => onMoveWindow(0, -MOVE_STEP)} rotation={0} />
          <div />
          <HoverRepeatButton onTrigger={() => onMoveWindow(-MOVE_STEP, 0)} rotation={-90} />
          <div />
          <HoverRepeatButton onTrigger={() => onMoveWindow(MOVE_STEP, 0)} rotation={90} />
          <div />
          <HoverRepeatButton onTrigger={() => onMoveWindow(0, MOVE_STEP)} rotation={180} />
          <div />
        </div>
        {/* Resize d-pad */}
        <div
          className="grid flex-shrink-0 mx-0.5"
          style={{ gridTemplateColumns: 'repeat(3, 14px)', gridTemplateRows: 'repeat(3, 14px)', gap: 1 }}
          title="Resize window — hover to expand in that direction"
        >
          <HoverRepeatButton onTrigger={() => onResizeWindow('top-left', -RESIZE_STEP, -RESIZE_STEP)} rotation={-45} />
          <HoverRepeatButton onTrigger={() => onResizeWindow('top', 0, -RESIZE_STEP)} rotation={0} />
          <HoverRepeatButton onTrigger={() => onResizeWindow('top-right', RESIZE_STEP, -RESIZE_STEP)} rotation={45} />
          <HoverRepeatButton onTrigger={() => onResizeWindow('left', -RESIZE_STEP, 0)} rotation={-90} />
          <div className="flex items-center justify-center">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
              <rect x="1.5" y="1.5" width="5" height="5" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
            </svg>
          </div>
          <HoverRepeatButton onTrigger={() => onResizeWindow('right', RESIZE_STEP, 0)} rotation={90} />
          <HoverRepeatButton onTrigger={() => onResizeWindow('bottom-left', -RESIZE_STEP, RESIZE_STEP)} rotation={-135} />
          <HoverRepeatButton onTrigger={() => onResizeWindow('bottom', 0, RESIZE_STEP)} rotation={180} />
          <HoverRepeatButton onTrigger={() => onResizeWindow('bottom-right', RESIZE_STEP, RESIZE_STEP)} rotation={135} />
        </div>
      </div>
    </div>
  )
}
