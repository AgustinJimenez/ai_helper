import { contextBridge, ipcRenderer } from 'electron'
import type { BackendType, ResizeEdge, ScreenPermissionStatus, Settings, SettingsUpdate } from '../shared/types'

contextBridge.exposeInMainWorld('api', {
  onCaptureTrigger: (cb: () => void) => {
    const listener = (): void => cb()
    ipcRenderer.on('capture:triggered', listener)
    return () => ipcRenderer.removeListener('capture:triggered', listener)
  },
  onStreamStart: (cb: () => void) => {
    const listener = (): void => cb()
    ipcRenderer.on('stream:start', listener)
    return () => ipcRenderer.removeListener('stream:start', listener)
  },
  onStreamChunk: (cb: (text: string) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: { text: string }): void => cb(data.text)
    ipcRenderer.on('stream:chunk', listener)
    return () => ipcRenderer.removeListener('stream:chunk', listener)
  },
  onStreamDone: (cb: () => void) => {
    const listener = (): void => cb()
    ipcRenderer.on('stream:done', listener)
    return () => ipcRenderer.removeListener('stream:done', listener)
  },
  onStreamError: (cb: (error: string) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: { error: string }): void => cb(data.error)
    ipcRenderer.on('stream:error', listener)
    return () => ipcRenderer.removeListener('stream:error', listener)
  },
  onClear: (cb: () => void) => {
    const listener = (): void => cb()
    ipcRenderer.on('clear', listener)
    return () => ipcRenderer.removeListener('clear', listener)
  },
  capture: (): Promise<void> => ipcRenderer.invoke('capture'),
  askFollowup: (text: string): Promise<void> => ipcRenderer.invoke('ask-followup', text),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('get-settings'),
  getInteractionEnabled: (): Promise<boolean> => ipcRenderer.invoke('get-interaction-enabled'),
  setSettings: (settings: SettingsUpdate): Promise<void> =>
    ipcRenderer.invoke('set-settings', settings),
  setInteractionEnabled: (enabled: boolean): void => {
    ipcRenderer.send('set-interaction-enabled', enabled)
  },
  clearConversation: (): void => {
    ipcRenderer.send('clear-conversation')
  },
  quit: (): void => {
    ipcRenderer.send('quit')
  },
  onPermissionError: (cb: () => void) => {
    const listener = (): void => cb()
    ipcRenderer.on('permission:screen', listener)
    return () => ipcRenderer.removeListener('permission:screen', listener)
  },
  openScreenSettings: (): void => {
    ipcRenderer.send('open-screen-settings')
  },
  getScreenPermission: (): Promise<ScreenPermissionStatus> => ipcRenderer.invoke('get-screen-permission'),
  checkBackendAvailability: (): Promise<Record<BackendType, boolean>> =>
    ipcRenderer.invoke('check-backend-availability'),
  moveWindowBy: (dx: number, dy: number): void => ipcRenderer.send('move-window-by', { dx, dy }),
  resizeWindowBy: (edge: ResizeEdge, dx: number, dy: number): void =>
    ipcRenderer.send('resize-window-by', { edge, dx, dy }),
  onInteractionModeChange: (cb: (enabled: boolean) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: { enabled: boolean }): void => cb(data.enabled)
    ipcRenderer.on('interaction:mode', listener)
    return () => ipcRenderer.removeListener('interaction:mode', listener)
  }
})
