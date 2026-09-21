import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { Direction } from '../lib/game'

const SWIPE_THRESHOLD_PX = 24

interface Origin {
  pointerId: number
  x: number
  y: number
}

export interface SwipeHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
  onLostPointerCapture: (event: ReactPointerEvent<HTMLElement>) => void
}

/** Pointer events cover both touch swipes and mouse drags on the board. */
export function useSwipeControls(onDirection: (direction: Direction) => void): SwipeHandlers {
  const origin = useRef<Origin | null>(null)

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!event.isPrimary) return
    origin.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY }
    // A mouse pointer gets no implicit capture, so a swipe released past the
    // edge of the board would be delivered elsewhere and silently dropped.
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [])

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const start = origin.current
      if (!start || start.pointerId !== event.pointerId) return
      origin.current = null

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

  const forget = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (origin.current?.pointerId === event.pointerId) origin.current = null
  }, [])

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel: forget,
    // Capture can end without a pointerup, which would otherwise leave a stale
    // origin behind and turn some later release into a phantom swipe.
    onLostPointerCapture: forget
  }
}
