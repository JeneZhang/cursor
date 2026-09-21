import { useCallback } from 'react'
import { Board } from './components/Board'
import { BoardOverlay } from './components/BoardOverlay'
import { DirectionPad } from './components/DirectionPad'
import { ScoreBoard } from './components/ScoreBoard'
import { useGameSession } from './hooks/useGameSession'
import { useKeyboardControls } from './hooks/useKeyboardControls'
import { useSwipeControls } from './hooks/useSwipeControls'
import { BOARD_SIZES, highestValue, type Direction } from './lib/game'
import { bestFor } from './lib/session'

export default function App(): React.JSX.Element {
  const [session, dispatch] = useGameSession()
  const { game } = session
  const canUndo = session.past.length > 0

  const handleDirection = useCallback(
    (direction: Direction) => dispatch({ type: 'move', direction }),
    [dispatch]
  )
  const handleRestart = useCallback(() => dispatch({ type: 'restart' }), [dispatch])
  const handleUndo = useCallback(() => dispatch({ type: 'undo' }), [dispatch])
  const handleContinue = useCallback(() => dispatch({ type: 'continue' }), [dispatch])

  useKeyboardControls({
    onDirection: handleDirection,
    onRestart: handleRestart,
    onUndo: handleUndo
  })
  const swipe = useSwipeControls(handleDirection)

  const best = bestFor(session)
  const highest = highestValue(game.tiles)

  return (
    <div className="app">
      <header className="toolbar">
        <span className="brand">2048 小游戏</span>
        <span className="muted">合并相同数字，拼出 2048</span>
        <span className="path">方向键 / WASD / 滑动棋盘</span>
      </header>

      <main className="game-page">
        <section className="game-panel">
          <div className="game-head">
            <div className="headline">
              <h1>
                {game.size}×{game.size}
              </h1>
              <p className="muted">
                {game.status === 'over'
                  ? '棋盘锁死了，撤销一步或重开一局'
                  : game.keepPlaying
                    ? '已通关，继续冲更大的数字'
                    : '把两个相同的数字撞在一起'}
              </p>
            </div>
            <ScoreBoard score={game.score} best={best} gain={session.lastGain} />
          </div>

          <div className="controls">
            <button type="button" className="primary" onClick={handleRestart}>
              新游戏
            </button>
            <button type="button" onClick={handleUndo} disabled={!canUndo}>
              撤销{canUndo ? ` (${session.past.length})` : ''}
            </button>
            <label className="size-picker">
              棋盘
              <select
                value={game.size}
                onChange={(event) => {
                  dispatch({ type: 'resize', size: Number(event.target.value) })
                  // Hand keyboard focus back to the board, or arrow keys would
                  // keep cycling the dropdown instead of moving tiles.
                  event.target.blur()
                }}
              >
                {BOARD_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}×{size}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="board-frame">
            <Board size={game.size} tiles={game.tiles} swipe={swipe} />
            <BoardOverlay
              status={game.status}
              score={game.score}
              onRestart={handleRestart}
              onContinue={handleContinue}
              onUndo={handleUndo}
              canUndo={canUndo}
            />
          </div>

          <div className="stats">
            <div className="stat">
              <span className="label">步数</span>
              <span className="value">{game.moves}</span>
            </div>
            <div className="stat">
              <span className="label">最大方块</span>
              <span className="value">{highest}</span>
            </div>
            <div className="stat">
              <span className="label">可撤销</span>
              <span className="value">{session.past.length}</span>
            </div>
          </div>

          <DirectionPad onDirection={handleDirection} disabled={game.status !== 'playing'} />

          <p className="hint muted">
            键盘：方向键或 WASD 移动，<kbd>U</kbd> 撤销，<kbd>R</kbd>{' '}
            重开。触屏或鼠标可直接在棋盘上滑动。
          </p>
        </section>
      </main>
    </div>
  )
}
