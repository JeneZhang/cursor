import { Link } from 'react-router-dom'
import { UPDATES } from '../data/updates'
import { useCatalog } from '../lib/catalog-context'
import type { Priority } from '../types'

export function CompetitorsPage() {
  const { competitors, setPriority, reset } = useCatalog()

  return (
    <>
      <div className="filters">
        <span className="muted">可改优先级：P0 必盯，P1 重点，P2 观察。改动保存在本机浏览器。</span>
        <Link className="nav-link" to="/competitors/new">
          新建竞品
        </Link>
        <button type="button" onClick={() => reset()}>
          恢复默认列表
        </button>
      </div>
      <div className="panel fill">
        <table className="competitor-table">
          <thead>
            <tr>
              <th>优先级</th>
              <th>产品</th>
              <th>厂商</th>
              <th>姿态</th>
              <th>条目</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((item) => {
              const count = UPDATES.filter((update) => update.competitorId === item.id).length
              return (
                <tr key={item.id}>
                  <td>
                    <select
                      aria-label={`${item.name} 优先级`}
                      value={item.priority}
                      onChange={(event) => setPriority(item.id, event.target.value as Priority)}
                    >
                      <option value="P0">P0</option>
                      <option value="P1">P1</option>
                      <option value="P2">P2</option>
                    </select>
                  </td>
                  <td>
                    <Link className="name" to={`/competitors/${item.id}`}>
                      {item.name}
                    </Link>
                  </td>
                  <td>{item.vendor}</td>
                  <td>{item.posture}</td>
                  <td>{count}</td>
                  <td>
                    <Link to={`/competitors/${item.id}/edit`}>编辑</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
