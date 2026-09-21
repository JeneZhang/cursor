interface Props {
  score: number
  best: number
  gain: { amount: number; seq: number } | null
}

export function ScoreBoard({ score, best, gain }: Props): React.JSX.Element {
  return (
    <div className="scores">
      <div className="score-box">
        <span className="label">得分</span>
        <span className="value">{score}</span>
        {gain ? (
          <span className="gain" key={gain.seq}>
            +{gain.amount}
          </span>
        ) : null}
      </div>
      <div className="score-box">
        <span className="label">最高分</span>
        <span className="value">{best}</span>
      </div>
    </div>
  )
}
