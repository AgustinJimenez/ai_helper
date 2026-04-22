import { globalShortcut, BrowserWindow } from 'electron'

export function registerHotkeys(overlay: BrowserWindow, onCapture: () => void): void {
  globalShortcut.register('CommandOrControl+Shift+Space', onCapture)

  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (overlay.isVisible()) {
      overlay.hide()
    } else {
      overlay.show()
    }
  })

  globalShortcut.register('CommandOrControl+Shift+X', () => {
    overlay.webContents.send('clear')
  })
}

export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll()
}
