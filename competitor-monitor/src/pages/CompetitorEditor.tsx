import { Link, useNavigate, useParams } from 'react-router-dom'
import { CompetitorForm } from '../components/CompetitorForm'
import { useCatalog } from '../lib/catalog-context'

export function CompetitorEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { byId, add, update } = useCatalog()
  const existing = id ? byId[id] : undefined

  if (id && !existing) {
    return (
      <div className="empty">
        <h1>没有这个竞品</h1>
        <p>
          <Link to="/competitors">返回列表</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="panel fill">
      <CompetitorForm
        initial={existing}
        submitLabel={existing ? '保存' : '添加'}
        onCancel={() => navigate(existing ? `/competitors/${existing.id}` : '/competitors')}
        onSubmit={(draft) => {
          if (existing) {
            update(existing.id, draft)
            navigate(`/competitors/${existing.id}`)
            return
          }
          const nextId = add(draft)
          navigate(`/competitors/${nextId}`)
        }}
      />
    </div>
  )
}
