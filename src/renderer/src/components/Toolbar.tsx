import { useState, useRef, useEffect, useCallback } from 'react'
import type { InterviewMode } from '../../../shared/types'

const MODES: { value: InterviewMode; label: string }[] = [
  { value: 'coding', label: 'Coding' },
  { value: 'system-design', label: 'System Design' },
  { value: 'behavioral', label: 'Behavioral' }
]

interface Props {
  mode: InterviewMode
  onModeChange: (mode: InterviewMode) => void
  onCapture: () => void
  onSettings: () => void
  onClear: () => void
  onQuit: () => void
  isCapturing: boolean
  hasMessages: boolean
}

const COUNTDOWN_START = 3

export function Toolbar({ mode, onModeChange, onCapture, onSettings, onClear, onQuit, isCapturing, hasMessages }: Props): JSX.Element {
  const [countdown, setCountdown] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const [isDragging, setIsDragging] = useState(false)

  const handleGripMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    let lastX = e.screenX
    let lastY = e.screenY
    setIsDragging(true)

    const onMouseMove = (ev: MouseEvent): void => {
      window.api.moveWindowBy(ev.screenX - lastX, ev.screenY - lastY)
      lastX = ev.screenX
      lastY = ev.screenY
    }

    const onMouseUp = (): void => {
      setIsDragging(false)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

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
      <div
        title="Drag to move"
        onMouseDown={handleGripMouseDown}
        className="flex items-center justify-center w-4 h-5 text-gray-600 hover:text-gray-400 transition-colors flex-shrink-0 mr-0.5 select-none"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        ⠿
      </div>
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
      <div className="flex gap-0.5 flex-1 mx-1">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onModeChange(m.value)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              mode === m.value
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {m.label}
          </button>
        ))}
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
        title="Settings"
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
