import { useState, useEffect } from 'react'
import { isBackendType } from '../../../shared/types'
import type { BackendType, PromptTemplate } from '../../../shared/types'

interface Props {
  onSave: () => void
  onClose?: () => void
}

export function Settings({ onSave, onClose }: Props): JSX.Element {
  const [backend, setBackend] = useState<BackendType>('claude-cli')
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([])
  const [selectedPromptTemplateId, setSelectedPromptTemplateId] = useState('coding')
  const [overlayOpacity, setOverlayOpacity] = useState(95)
  const [availability, setAvailability] = useState<Record<BackendType, boolean> | null>(null)

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setBackend(s.backend)
      setPromptTemplates(s.promptTemplates)
      setSelectedPromptTemplateId(s.selectedPromptTemplateId)
      setOverlayOpacity(Math.round(s.overlayOpacity * 100))
    })
    window.api.checkBackendAvailability().then(setAvailability)
  }, [])

  const handleSave = async (): Promise<void> => {
    await window.api.setSettings({
      backend,
      promptTemplates,
      selectedPromptTemplateId,
      overlayOpacity: overlayOpacity / 100
    })
    onSave()
  }

  const selectedTemplate = promptTemplates.find((template) => template.id === selectedPromptTemplateId) ?? null
  const canDeleteTemplate = promptTemplates.length > 1
  const canSave = promptTemplates.length > 0
    && promptTemplates.some((template) => template.id === selectedPromptTemplateId)
    && promptTemplates.every((template) => template.name.trim() && template.prompt.trim())

  const updateSelectedTemplate = (patch: Partial<PromptTemplate>): void => {
    setPromptTemplates((currentTemplates) =>
      currentTemplates.map((template) =>
        template.id === selectedPromptTemplateId
          ? { ...template, ...patch }
          : template
      )
    )
  }

  const handleAddTemplate = (): void => {
    const newTemplate: PromptTemplate = {
      id: createPromptTemplateId(),
      name: `Template ${promptTemplates.length + 1}`,
      prompt: 'You are a silent assistant. Answer clearly, concisely, and with high signal.'
    }

    setPromptTemplates((currentTemplates) => [...currentTemplates, newTemplate])
    setSelectedPromptTemplateId(newTemplate.id)
  }

  const handleDeleteTemplate = (): void => {
    if (!canDeleteTemplate) {
      return
    }

    const templateIndex = promptTemplates.findIndex((template) => template.id === selectedPromptTemplateId)
    const nextTemplates = promptTemplates.filter((template) => template.id !== selectedPromptTemplateId)
    const fallbackTemplate = nextTemplates[Math.max(0, templateIndex - 1)] ?? nextTemplates[0]

    setPromptTemplates(nextTemplates)
    setSelectedPromptTemplateId(fallbackTemplate.id)
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden p-5 gap-4"
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

      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
        <div>
          <label className="text-gray-400 text-xs block mb-1">AI Backend</label>
          <div className="space-y-1.5">
            {(
              [
                { value: 'claude-cli', label: 'Claude Code CLI', install: 'npm i -g @anthropic-ai/claude-code' },
                { value: 'codex-cli', label: 'OpenAI Codex CLI', install: 'npm i -g @openai/codex' },
                { value: 'gemini-cli', label: 'Gemini CLI (experimental)', install: 'npm i -g @google/gemini-cli' },
              ] as const
            ).map(({ value, label, install }) => {
              const available = availability?.[value]
              const isSelected = backend === value
              return (
                <label
                  key={value}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded cursor-pointer border transition-colors ${
                    isSelected
                      ? 'border-blue-500/60 bg-blue-900/20'
                      : 'border-gray-700/50 bg-gray-800/50 hover:bg-gray-800'
                  }`}
                >
                  <input
                    type="radio"
                    name="backend"
                    value={value}
                    checked={isSelected}
                    onChange={() => setBackend(value)}
                    className="sr-only"
                  />
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      availability === null
                        ? 'bg-gray-600'
                        : available
                          ? 'bg-green-400'
                          : 'bg-red-500'
                    }`}
                    title={
                      availability === null
                        ? 'Checking…'
                        : available
                          ? 'CLI found'
                          : `Not installed — ${install}`
                    }
                  />
                  <span className="text-white text-sm flex-1">{label}</span>
                  {availability !== null && !available && (
                    <code className="text-gray-500 text-xs hidden sm:block">{install}</code>
                  )}
                </label>
              )
            })}
          </div>
        </div>

        <div className="border border-gray-800 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-gray-400 text-xs">Window Transparency</label>
            <span className="text-gray-500 text-xs">{overlayOpacity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={overlayOpacity}
            onChange={(event) => setOverlayOpacity(Number(event.target.value))}
            className="w-full accent-blue-500"
          />
          <p className="text-gray-600 text-xs">
            `0%` is fully transparent, `100%` is fully opaque.
          </p>
        </div>

        <div className="border border-gray-800 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-gray-400 text-xs">Prompt Templates</label>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleAddTemplate}
                className="px-2 py-1 rounded text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                New
              </button>
              <button
                onClick={handleDeleteTemplate}
                disabled={!canDeleteTemplate}
                className="px-2 py-1 rounded text-xs text-red-300 bg-gray-800 hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </div>
          </div>

          <select
            value={selectedPromptTemplateId}
            onChange={(event) => setSelectedPromptTemplateId(event.target.value)}
            className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/70"
          >
            {promptTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>

          <div>
            <label className="text-gray-400 text-xs block mb-1">Template Name</label>
            <input
              value={selectedTemplate?.name ?? ''}
              onChange={(event) => updateSelectedTemplate({ name: event.target.value })}
              className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/70"
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs block mb-1">System Prompt</label>
            <textarea
              value={selectedTemplate?.prompt ?? ''}
              onChange={(event) => updateSelectedTemplate({ prompt: event.target.value })}
              rows={12}
              className="w-full resize-y bg-gray-800 text-white text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500/70"
            />
          </div>

          {!canSave && (
            <p className="text-yellow-500 text-xs">
              Each template needs a name and a prompt, and one template must remain selected.
            </p>
          )}
        </div>

        <p className="text-gray-600 text-xs">
          Capture protection on macOS is not universal. Verify behavior in the specific recorder or browser flow you plan to use.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={!canSave}
        className="bg-blue-600 hover:bg-blue-500 text-white rounded px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Save & Continue
      </button>
    </div>
  )
}

function createPromptTemplateId(): string {
  return `template-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
