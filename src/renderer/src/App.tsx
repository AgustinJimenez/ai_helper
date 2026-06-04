import { useEffect, useRef, useState } from 'react'
import { Toolbar } from './components/Toolbar'
import { Answer } from './components/Answer'
import { FollowUp } from './components/FollowUp'
import { Settings } from './components/Settings'
import type { BackendType, PromptTemplate, ResizeEdge } from '../../shared/types'
import { useWindowDrag } from './lib/useWindowDrag'
import { useWindowResize } from './lib/useWindowResize'

interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ResizeIndicatorState {
  edge: ResizeEdge
  x: number
  y: number
}

const RESIZE_HOTSPOTS: Array<{ edge: ResizeEdge; className: string }> = [
  { edge: 'left', className: 'absolute inset-y-3 left-0 z-20 w-2' },
  { edge: 'right', className: 'absolute inset-y-3 right-0 z-20 w-2' },
  { edge: 'top', className: 'absolute inset-x-3 top-0 z-20 h-2' },
  { edge: 'bottom', className: 'absolute inset-x-3 bottom-0 z-20 h-2' },
  { edge: 'top-left', className: 'absolute left-0 top-0 z-20 h-3 w-3' },
  { edge: 'top-right', className: 'absolute right-0 top-0 z-20 h-3 w-3' },
  { edge: 'bottom-left', className: 'absolute bottom-0 left-0 z-20 h-3 w-3' },
  { edge: 'bottom-right', className: 'absolute bottom-0 right-0 z-20 h-3 w-3' }
]

export default function App(): JSX.Element {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [selectedPromptTemplateId, setSelectedPromptTemplateId] = useState('coding')
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([])
  const [backend, setBackend] = useState<BackendType>('claude-cli')
  const [showSettings, setShowSettings] = useState(false)
  const [interactionEnabled, setInteractionEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [fontSize, setFontSize] = useState(14)
  const [resizeIndicator, setResizeIndicator] = useState<ResizeIndicatorState | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const handleWindowDrag = useWindowDrag()
  const resizeHandlers = {
    left: useWindowResize('left'),
    right: useWindowResize('right'),
    top: useWindowResize('top'),
    bottom: useWindowResize('bottom'),
    'top-left': useWindowResize('top-left'),
    'top-right': useWindowResize('top-right'),
    'bottom-left': useWindowResize('bottom-left'),
    'bottom-right': useWindowResize('bottom-right')
  } as const

  const refreshSettings = (): Promise<void> => {
    return window.api.getSettings().then((settings) => {
      setSelectedPromptTemplateId(settings.selectedPromptTemplateId)
      setPromptTemplates(settings.promptTemplates)
      setBackend(settings.backend)
    })
  }

  useEffect(() => {
    void refreshSettings()
    window.api.getInteractionEnabled().then(setInteractionEnabled)

    window.api.getScreenPermission().then((status) => {
      if (status !== 'granted') setPermissionDenied(true)
    })

    const off: Array<() => void> = []

    off.push(
      window.api.onCaptureTrigger(() => {
        setMessages((prev) => [...prev, { role: 'user', content: '📸 Screenshot captured' }])
      })
    )

    off.push(
      window.api.onStreamStart(() => {
        setIsStreaming(true)
        setError(null)
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
      })
    )

    off.push(
      window.api.onStreamChunk((text) => {
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          updated[updated.length - 1] = { ...last, content: last.content + text }
          return updated
        })
      })
    )

    off.push(window.api.onStreamDone(() => setIsStreaming(false)))

    off.push(
      window.api.onStreamError((err) => {
        setIsStreaming(false)
        setError(err)
      })
    )

    off.push(
      window.api.onClear(() => {
        setMessages([])
        setError(null)
        window.api.clearConversation()
      })
    )

    off.push(
      window.api.onPermissionError(() => setPermissionDenied(true))
    )

    off.push(
      window.api.onInteractionModeChange((enabled) => {
        setInteractionEnabled(enabled)
        if (!enabled) {
          setResizeIndicator(null)
        }
      })
    )

    return () => off.forEach((fn) => fn())
  }, [])

  useEffect(() => {
    if (showSettings || interactionEnabled) {
      return
    }

    const handleMouseMove = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null

      if (target?.closest('[data-interaction-toggle="true"]')) {
        window.api.setInteractionEnabled(true)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [interactionEnabled, showSettings])

  const handlePromptTemplateChange = (promptTemplateId: string): void => {
    setSelectedPromptTemplateId(promptTemplateId)
    window.api.setSettings({ selectedPromptTemplateId: promptTemplateId })
  }

  const handleBackendChange = (newBackend: BackendType): void => {
    setBackend(newBackend)
    window.api.setSettings({ backend: newBackend })
  }

  const handleFollowup = async (text: string): Promise<void> => {
    if (isStreaming) return
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    await window.api.askFollowup(text)
  }

  const handleClear = (): void => {
    setMessages([])
    setError(null)
    window.api.clearConversation()
  }

  const handleResizeHover = (edge: ResizeEdge, event: React.MouseEvent<HTMLElement>): void => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }

    const nextX = getIndicatorX(edge, event.clientX - rect.left, rect.width)
    const nextY = getIndicatorY(edge, event.clientY - rect.top, rect.height)

    setResizeIndicator({ edge, x: nextX, y: nextY })
  }

  const clearResizeIndicator = (): void => {
    setResizeIndicator(null)
  }

  if (showSettings) {
    return (
      <div
        onMouseDown={handleWindowDrag}
        ref={rootRef}
        className="relative w-full h-screen rounded-xl bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 overflow-hidden"
      >
        <Settings
          onSave={() => {
            void refreshSettings()
            setShowSettings(false)
          }}
          onClose={() => {
            setShowSettings(false)
          }}
        />
      </div>
    )
  }

  return (
    <div
      onMouseDown={handleWindowDrag}
      onMouseLeave={clearResizeIndicator}
      ref={rootRef}
      className="relative w-full h-screen flex flex-col rounded-xl bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 overflow-hidden"
    >
      <Toolbar
        promptTemplates={promptTemplates}
        selectedPromptTemplateId={selectedPromptTemplateId}
        backend={backend}
        interactionEnabled={interactionEnabled}
        onPromptTemplateChange={handlePromptTemplateChange}
        onBackendChange={handleBackendChange}
        onCapture={() => window.api.capture()}
        onSettings={() => {
          window.api.setInteractionEnabled(true)
          setShowSettings(true)
        }}
        onClear={handleClear}
        onQuit={() => window.api.quit()}
        onZoomIn={() => setFontSize((f) => Math.min(f + 2, 22))}
        onZoomOut={() => setFontSize((f) => Math.max(f - 2, 10))}
        onMoveWindow={(dx, dy) => window.api.moveWindowBy(dx, dy)}
        isCapturing={isStreaming}
        hasMessages={messages.length > 0}
      />
      {permissionDenied && (
        <div className="mx-3 mt-2 p-3 bg-yellow-900/40 border border-yellow-700/50 rounded-lg flex-shrink-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-yellow-300 text-xs font-medium mb-1">⚠ Screen Recording permission required</p>
              <p className="text-yellow-500 text-xs mb-2">Grant access in System Settings, then restart the app.</p>
              <button
                onClick={() => window.api.openScreenSettings()}
                className="text-xs bg-yellow-700 hover:bg-yellow-600 text-white px-3 py-1 rounded transition-colors"
              >
                Open System Settings →
              </button>
            </div>
            <button
              onClick={() => setPermissionDenied(false)}
              className="text-yellow-700 hover:text-yellow-400 text-xs flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <Answer messages={messages} isStreaming={isStreaming} error={error} fontSize={fontSize} />
      <FollowUp onSubmit={handleFollowup} disabled={isStreaming} />
      {RESIZE_HOTSPOTS.map(({ edge, className }) => (
        <div
          key={edge}
          onMouseDown={interactionEnabled ? resizeHandlers[edge] : undefined}
          onMouseEnter={(event) => handleResizeHover(edge, event)}
          onMouseMove={(event) => handleResizeHover(edge, event)}
          onMouseLeave={clearResizeIndicator}
          data-no-window-drag="true"
          className={className}
        />
      ))}
      {resizeIndicator && (
        <div
          data-no-window-drag="true"
          className="pointer-events-none absolute z-30 flex h-5 w-5 items-center justify-center rounded bg-gray-800/85 text-[11px] text-gray-200"
          style={{
            left: `${resizeIndicator.x}px`,
            top: `${resizeIndicator.y}px`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {getResizeIndicatorIcon(resizeIndicator.edge)}
        </div>
      )}
    </div>
  )
}

function getIndicatorX(edge: ResizeEdge, pointerX: number, width: number): number {
  if (edge.includes('left')) return 8
  if (edge.includes('right')) return width - 8
  return clamp(pointerX, 16, width - 16)
}

function getIndicatorY(edge: ResizeEdge, pointerY: number, height: number): number {
  if (edge.includes('top')) return 8
  if (edge.includes('bottom')) return height - 8
  return clamp(pointerY, 16, height - 16)
}

function getResizeIndicatorIcon(edge: ResizeEdge): string {
  switch (edge) {
    case 'left':
    case 'right':
      return '↔'
    case 'top':
    case 'bottom':
      return '↕'
    case 'top-left':
    case 'bottom-right':
      return '⤡'
    case 'top-right':
    case 'bottom-left':
      return '⤢'
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
