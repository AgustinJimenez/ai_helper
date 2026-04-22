/// <reference types="vite/client" />

import type { ScreenPermissionStatus, Settings, SettingsUpdate } from '../../shared/types'

declare global {
  interface Window {
    api: {
      onCaptureTrigger(cb: () => void): () => void
      onStreamStart(cb: () => void): () => void
      onStreamChunk(cb: (text: string) => void): () => void
      onStreamDone(cb: () => void): () => void
      onStreamError(cb: (error: string) => void): () => void
      onClear(cb: () => void): () => void
      capture(): Promise<void>
      askFollowup(text: string): Promise<void>
      getSettings(): Promise<Settings & { hasApiKey: boolean }>
      setSettings(settings: SettingsUpdate): Promise<void>
      clearConversation(): void
      quit(): void
      onPermissionError(cb: () => void): () => void
      openScreenSettings(): void
      getScreenPermission(): Promise<ScreenPermissionStatus>
      moveWindowBy(dx: number, dy: number): void
    }
  }
}
