import { desktopCapturer, screen, systemPreferences } from 'electron'

export function getScreenPermission(): 'granted' | 'denied' | 'not-determined' {
  if (process.platform !== 'darwin') return 'granted'
  return systemPreferences.getMediaAccessStatus('screen') as 'granted' | 'denied' | 'not-determined'
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
