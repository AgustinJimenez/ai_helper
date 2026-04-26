import { contextBridge, ipcRenderer } from 'electron'
import type { ScreenPermissionStatus, Settings, SettingsUpdate } from '../shared/types'

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
  setSettings: (settings: SettingsUpdate): Promise<void> =>
    ipcRenderer.invoke('set-settings', settings),
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
  moveWindowBy: (dx: number, dy: number): void => ipcRenderer.send('move-window-by', { dx, dy })
})
