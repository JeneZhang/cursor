import type { Direction } from '../lib/game'

interface Props {
  onDirection: (direction: Direction) => void
  disabled: boolean
}

const BUTTONS: { direction: Direction; label: string; className: string }[] = [
  { direction: 'up', label: '↑', className: 'up' },
  { direction: 'left', label: '←', className: 'left' },
  { direction: 'down', label: '↓', className: 'down' },
  { direction: 'right', label: '→', className: 'right' }
]

const LABELS: Record<Direction, string> = {
  up: '上移',
  down: '下移',
  left: '左移',
  right: '右移'
}

export function DirectionPad({ onDirection, disabled }: Props): React.JSX.Element {
  return (
    <div className="dpad">
      {BUTTONS.map((button) => (
        <button
          key={button.direction}
          type="button"
          className={`dpad-key ${button.className}`}
          onClick={() => onDirection(button.direction)}
          disabled={disabled}
          aria-label={LABELS[button.direction]}
        >
          {button.label}
        </button>
      ))}
    </div>
  )
}
