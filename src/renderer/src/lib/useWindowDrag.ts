import type { MouseEvent as ReactMouseEvent } from 'react'

interface WindowDragOptions {
  onlyOnSelf?: boolean
}

const INTERACTIVE_SELECTOR = 'button, input, textarea, select, option, a, [data-no-window-drag="true"]'

export function useWindowDrag(options: WindowDragOptions = {}): (event: ReactMouseEvent<HTMLElement>) => void {
  const { onlyOnSelf = false } = options

  return (event: ReactMouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null
    const currentTarget = event.currentTarget as HTMLElement

    if (onlyOnSelf && target !== currentTarget) return
    if (target?.closest(INTERACTIVE_SELECTOR)) return

    event.preventDefault()

    let lastX = event.screenX
    let lastY = event.screenY

    const onMouseMove = (moveEvent: MouseEvent): void => {
      window.api.moveWindowBy(moveEvent.screenX - lastX, moveEvent.screenY - lastY)
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
