import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { Direction } from '../lib/game'

const SWIPE_THRESHOLD_PX = 24

export interface SwipeHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: () => void
}

/** Pointer events cover both touch swipes and mouse drags on the board. */
export function useSwipeControls(onDirection: (direction: Direction) => void): SwipeHandlers {
  const origin = useRef<{ x: number; y: number } | null>(null)

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    origin.current = { x: event.clientX, y: event.clientY }
  }, [])

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const start = origin.current
      origin.current = null
      if (!start) return

      const deltaX = event.clientX - start.x
      const deltaY = event.clientY - start.y
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)
      if (Math.max(absX, absY) < SWIPE_THRESHOLD_PX) return

      if (absX > absY) {
        onDirection(deltaX > 0 ? 'right' : 'left')
      } else {
        onDirection(deltaY > 0 ? 'down' : 'up')
      }
    },
    [onDirection]
  )

  const onPointerCancel = useCallback(() => {
    origin.current = null
  }, [])

  return { onPointerDown, onPointerUp, onPointerCancel }
}
