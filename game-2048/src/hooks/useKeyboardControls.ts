import { useEffect } from 'react'
import type { Direction } from '../lib/game'

const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  k: 'up',
  j: 'down',
  h: 'left',
  l: 'right'
}

interface KeyboardHandlers {
  onDirection: (direction: Direction) => void
  onRestart: () => void
  onUndo: () => void
}

export function useKeyboardControls({ onDirection, onRestart, onUndo }: KeyboardHandlers): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.altKey || event.metaKey) return

      const target = event.target
      if (
        target instanceof HTMLElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      ) {
        return
      }

      const key = event.key
      const direction = DIRECTION_KEYS[key] ?? DIRECTION_KEYS[key.toLowerCase()]
      if (direction && !event.ctrlKey) {
        event.preventDefault()
        onDirection(direction)
        return
      }

      const lower = key.toLowerCase()
      if (lower === 'z' && event.ctrlKey) {
        event.preventDefault()
        onUndo()
        return
      }
      if (lower === 'u' && !event.ctrlKey) {
        event.preventDefault()
        onUndo()
        return
      }
      if (lower === 'r' && !event.ctrlKey) {
        event.preventDefault()
        onRestart()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onDirection, onRestart, onUndo])
}
