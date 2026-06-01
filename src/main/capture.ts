import { desktopCapturer, screen, systemPreferences } from 'electron'

export function getScreenPermission(): 'granted' | 'denied' | 'not-determined' {
  if (process.platform !== 'darwin') return 'granted'
  return systemPreferences.getMediaAccessStatus('screen') as 'granted' | 'denied' | 'not-determined'
}

// Triggers the macOS Screen Recording permission dialog immediately on launch
// by making a minimal getSources() call. Without this, the dialog appears on
// first capture (during a call). Safe to call before the overlay is ready.
export async function promptScreenPermission(): Promise<void> {
  if (process.platform !== 'darwin') return
  if (getScreenPermission() !== 'not-determined') return
  try {
    await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } })
  } catch {
    // ignore — we only care about triggering the dialog
  }
}

export async function captureScreen(): Promise<string> {
  const primary = screen.getPrimaryDisplay()
  const { width, height } = primary.size

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: width * 2, height: height * 2 }
  })

  if (!sources.length) throw new Error('No screen source found. Grant Screen Recording permission in System Settings → Privacy & Security → Screen Recording.')

  const png = sources[0].thumbnail.toPNG()

  if (!png || png.length < 1000) {
    throw new Error('Screen capture returned an empty image. Please grant Screen Recording permission in System Settings → Privacy & Security → Screen Recording, then restart the app.')
  }

  return png.toString('base64')
}
