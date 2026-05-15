import type { MouseEvent as ReactMouseEvent } from 'react'
import type { ResizeEdge } from '../../../shared/types'

export function useWindowResize(edge: ResizeEdge): (event: ReactMouseEvent<HTMLElement>) => void {
  return (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()

    let lastX = event.screenX
    let lastY = event.screenY

    const onMouseMove = (moveEvent: MouseEvent): void => {
      window.api.resizeWindowBy(edge, moveEvent.screenX - lastX, moveEvent.screenY - lastY)
      lastX = moveEvent.screenX
      lastY = moveEvent.screenY
    }

    const onMouseUp = (): void => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }
}
