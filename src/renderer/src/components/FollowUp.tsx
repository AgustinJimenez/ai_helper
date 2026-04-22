import { useState } from 'react'

interface Props {
  onSubmit: (text: string) => void
  disabled: boolean
}

export function FollowUp({ onSubmit, disabled }: Props): JSX.Element {
  const [value, setValue] = useState('')

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    const text = value.trim()
    if (!text || disabled) return
    onSubmit(text)
    setValue('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-1.5 px-2 py-1 border-t border-gray-700/50 flex-shrink-0"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={disabled ? 'Analyzing...' : 'Ask a follow-up...'}
        disabled={disabled}
        className="flex-1 bg-gray-800 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500/70 placeholder-gray-600 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="text-blue-400 hover:text-blue-300 disabled:opacity-30 disabled:cursor-not-allowed text-sm px-1 transition-colors"
      >
        ↵
      </button>
    </form>
  )
}
