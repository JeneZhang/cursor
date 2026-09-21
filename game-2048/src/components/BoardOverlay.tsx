import type { GameStatus } from '../lib/game'

interface Props {
  status: GameStatus
  score: number
  onRestart: () => void
  onContinue: () => void
  onUndo: () => void
  canUndo: boolean
}

export function BoardOverlay({
  status,
  score,
  onRestart,
  onContinue,
  onUndo,
  canUndo
}: Props): React.JSX.Element | null {
  if (status === 'playing') return null

  const won = status === 'won'

  return (
    <div className={`board-overlay ${won ? 'won' : 'over'}`} role="alertdialog" aria-live="polite">
      <h2>{won ? '拼出 2048 了！' : '没有可用的移动了'}</h2>
      <p className="muted">本局得分 {score}</p>
      <div className="overlay-actions">
        {won ? (
          <button type="button" className="primary" onClick={onContinue}>
            继续挑战
          </button>
        ) : (
          <button type="button" onClick={onUndo} disabled={!canUndo}>
            撤销一步
          </button>
        )}
        <button type="button" className={won ? undefined : 'primary'} onClick={onRestart}>
          再来一局
        </button>
      </div>
    </div>
  )
}
