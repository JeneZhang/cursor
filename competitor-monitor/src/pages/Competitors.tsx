import { Link } from 'react-router-dom'
import { CompetitorMark } from '../components/CompetitorMark'
import { COMPETITORS } from '../data/competitors'
import { UPDATES } from '../data/updates'

export function CompetitorsPage() {
  return (
    <div>
      <div className="section-head">
        <h2>竞品台账</h2>
        <span className="muted">P1 是直接办公 Agent；Manus 放在 P2 观察</span>
      </div>
      <table className="competitor-table">
        <thead>
          <tr>
            <th>优先级</th>
            <th>产品</th>
            <th>厂商</th>
            <th>姿态</th>
            <th>条目</th>
          </tr>
        </thead>
        <tbody>
          {COMPETITORS.map((item) => {
            const count = UPDATES.filter((update) => update.competitorId === item.id).length
            return (
              <tr key={item.id}>
                <td>{item.priority}</td>
                <td>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <CompetitorMark id={item.id} />
                    <Link className="name" to={`/competitors/${item.id}`}>
                      {item.name}
                    </Link>
                  </div>
                </td>
                <td>{item.vendor}</td>
                <td>{item.posture}</td>
                <td>{count}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
