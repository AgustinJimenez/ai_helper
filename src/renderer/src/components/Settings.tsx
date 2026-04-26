import { useState, useEffect } from 'react'
import { isBackendType } from '../../../shared/types'
import type { BackendType } from '../../../shared/types'

interface Props {
  onSave: () => void
  onClose?: () => void
}

export function Settings({ onSave, onClose }: Props): JSX.Element {
  const [backend, setBackend] = useState<BackendType>('claude-cli')

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setBackend(s.backend)
    })
  }, [])

  const handleSave = async (): Promise<void> => {
    await window.api.setSettings({
      backend
    })
    onSave()
  }

  return (
    <div
      className="flex flex-col h-full p-5 gap-4"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-sm">Settings</h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-sm px-1">
            ✕
          </button>
        )}
      </div>

      <div className="space-y-3 flex-1">
        <div>
          <label className="text-gray-400 text-xs block mb-1">AI Backend</label>
          <select
            value={backend}
            onChange={(e) => {
              const nextBackend = e.target.value
              if (isBackendType(nextBackend)) {
                setBackend(nextBackend)
              }
            }}
            className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/70"
          >
            <option value="claude-cli">Claude Code CLI</option>
            <option value="codex-cli">OpenAI Codex CLI</option>
            <option value="gemini-cli">Gemini CLI (experimental)</option>
          </select>
        </div>

        {backend === 'claude-cli' && (
          <p className="text-gray-600 text-xs">
            Requires Claude Code CLI: <code className="text-gray-400">npm i -g @anthropic-ai/claude-code</code>
          </p>
        )}
        {backend === 'codex-cli' && (
          <p className="text-gray-600 text-xs">
            Requires Codex CLI: <code className="text-gray-400">npm i -g @openai/codex</code>
          </p>
        )}
        {backend === 'gemini-cli' && (
          <p className="text-gray-600 text-xs">
            Requires Gemini CLI: <code className="text-gray-400">npm i -g @google/gemini-cli</code>
          </p>
        )}
      </div>

      <button
        onClick={handleSave}
        className="bg-blue-600 hover:bg-blue-500 text-white rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Save & Continue
      </button>
    </div>
  )
}
