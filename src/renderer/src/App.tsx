import { useState, useEffect } from 'react'
import { Toolbar } from './components/Toolbar'
import { Answer } from './components/Answer'
import { FollowUp } from './components/FollowUp'
import { Settings } from './components/Settings'
import type { InterviewMode } from '../../shared/types'

interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function App(): JSX.Element {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [mode, setMode] = useState<InterviewMode>('coding')
  const [showSettings, setShowSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setMode(s.interviewMode)
    })

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

    return () => off.forEach((fn) => fn())
  }, [])

  const handleModeChange = (newMode: InterviewMode): void => {
    setMode(newMode)
    window.api.setSettings({ interviewMode: newMode })
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

  if (showSettings) {
    return (
      <div className="w-full h-screen rounded-xl bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 overflow-hidden">
        <Settings
          onSave={() => setShowSettings(false)}
          onClose={() => setShowSettings(false)}
        />
      </div>
    )
  }

  return (
    <div className="w-full h-screen flex flex-col rounded-xl bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 overflow-hidden">
      <Toolbar
        mode={mode}
        onModeChange={handleModeChange}
        onCapture={() => window.api.capture()}
        onSettings={() => setShowSettings(true)}
        onClear={handleClear}
        onQuit={() => window.api.quit()}
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
      <Answer messages={messages} isStreaming={isStreaming} error={error} />
      <FollowUp onSubmit={handleFollowup} disabled={isStreaming} />
    </div>
  )
}
