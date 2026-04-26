import { app, BrowserWindow, ipcMain, screen, shell } from 'electron'
import { join } from 'node:path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerHotkeys, unregisterHotkeys } from './hotkeys'
import { captureScreen, getScreenPermission } from './capture'
import { loadSettings, saveSettings } from './settings'
import { getBackend } from './ai/backend'
import { getSystemPrompt } from './ai/prompts'
import { isBackendType, isInterviewMode } from '../shared/types'
import type { Message, InterviewMode, SettingsUpdate } from '../shared/types'

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message)
})

// Enforce single instance — second launch quits immediately
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let overlay: BrowserWindow
const history: Message[] = []
let currentMode: InterviewMode = 'coding'
let streaming = false
let backend = getBackend(loadSettings().backend)

function sanitizeSettingsUpdate(payload: unknown): SettingsUpdate {
  if (!payload || typeof payload !== 'object') return {}

  const raw = payload as Record<string, unknown>
  const settingsUpdate: SettingsUpdate = {}

  if (isBackendType(raw.backend)) {
    settingsUpdate.backend = raw.backend
  }
  if (isInterviewMode(raw.interviewMode)) {
    settingsUpdate.interviewMode = raw.interviewMode
  }
  if (typeof raw.overlayOpacity === 'number') {
    settingsUpdate.overlayOpacity = raw.overlayOpacity
  }

  return settingsUpdate
}

function createOverlay(): BrowserWindow {
  const display = screen.getPrimaryDisplay()
  const { x: waX, width: waW, height: waH } = display.workArea
  const { height: screenH } = display.size
  const winW = Math.round(waW / 2)
  const winH = Math.round(waH / 4)
  const x = waX + waW - winW
  const y = screenH - winH

  const win = new BrowserWindow({
    width: winW,
    height: winH,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: true,
    resizable: true,
    maximizable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setContentProtection(true)

  // Force position after load — macOS clamps during construction
  win.webContents.once('did-finish-load', () => {
    win.setBounds({ x, y: screenH - winH, width: winW, height: winH })
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

async function handleCapture(): Promise<void> {
  if (streaming) return

  const permission = getScreenPermission()
  if (permission !== 'granted') {
    overlay.webContents.send('permission:screen')
    return
  }

  try {
    streaming = true
    overlay.webContents.send('capture:triggered')
    overlay.webContents.send('stream:start')

    const imageBase64 = await captureScreen()
    const userMsg: Message = { role: 'user', content: 'Analyze this screenshot.', imageBase64 }
    history.push(userMsg)

    const systemPrompt = getSystemPrompt(currentMode)

    let fullResponse = ''
    await backend.sendMessage(systemPrompt, history, (chunk) => {
      fullResponse += chunk
      overlay.webContents.send('stream:chunk', { text: chunk })
    })

    history.push({ role: 'assistant', content: fullResponse })
    overlay.webContents.send('stream:done')
  } catch (err) {
    overlay.webContents.send('stream:error', { error: String(err) })
  } finally {
    streaming = false
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.agustinjimenez.aihelper')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const settings = loadSettings()
  currentMode = settings.interviewMode

  overlay = createOverlay()
  registerHotkeys(overlay, handleCapture)

  ipcMain.handle('get-screen-permission', async () => {
    // In dev, Electron inherits Terminal's screen recording permission.
    // The permission check is only meaningful in a packaged .app.
    if (is.dev) return 'granted'

    const status = getScreenPermission()
    if (status !== 'granted') return status

    // Double-check with a real capture — getMediaAccessStatus can lie.
    try {
      const png = await captureScreen()
      return png.length > 0 ? 'granted' : 'denied'
    } catch {
      return 'denied'
    }
  })

  ipcMain.handle('capture', handleCapture)

  ipcMain.handle('ask-followup', async (_, text: string) => {
    if (streaming) return

    try {
      streaming = true
      history.push({ role: 'user', content: text })
      overlay.webContents.send('stream:start')

      const systemPrompt = getSystemPrompt(currentMode)

      let fullResponse = ''
      await backend.sendMessage(systemPrompt, history, (chunk) => {
        fullResponse += chunk
        overlay.webContents.send('stream:chunk', { text: chunk })
      })

      history.push({ role: 'assistant', content: fullResponse })
      overlay.webContents.send('stream:done')
    } catch (err) {
      overlay.webContents.send('stream:error', { error: String(err) })
    } finally {
      streaming = false
    }
  })

  ipcMain.handle('get-settings', () => {
    return loadSettings()
  })

  ipcMain.handle('set-settings', (_, payload: unknown) => {
    const update = sanitizeSettingsUpdate(payload)
    saveSettings(update)

    const nextSettings = loadSettings()
    currentMode = nextSettings.interviewMode
    backend = getBackend(nextSettings.backend)
  })

  ipcMain.on('clear-conversation', () => {
    history.length = 0
    backend.resetSession?.()
  })

  ipcMain.on('move-window-by', (_, { dx, dy }: { dx: number; dy: number }) => {
    const [x, y] = overlay.getPosition()
    overlay.setPosition(Math.round(x + dx), Math.round(y + dy))
  })

  ipcMain.on('quit', () => {
    app.quit()
  })

  ipcMain.on('open-screen-settings', () => {
    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture')
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      overlay = createOverlay()
    }
  })
})

app.on('will-quit', unregisterHotkeys)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
