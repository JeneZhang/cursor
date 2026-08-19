import { useState } from 'react'
import type { Competitor, CompetitorDraft, Priority, Region } from '../types'

interface Props {
  initial?: Competitor
  submitLabel: string
  onSubmit: (draft: CompetitorDraft) => void
  onCancel: () => void
}

export function CompetitorForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [vendor, setVendor] = useState(initial?.vendor ?? '')
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'P1')
  const [region, setRegion] = useState<Region>(initial?.region ?? 'cn')
  const [posture, setPosture] = useState(initial?.posture ?? '')
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [website, setWebsite] = useState(initial?.website ?? '')
  const [watchUrl, setWatchUrl] = useState(initial?.watchUrl ?? '')
  const [watchLabel, setWatchLabel] = useState(initial?.watchLabel ?? '')
  const [threatNotes, setThreatNotes] = useState(initial?.threatNotes ?? '')
  const [error, setError] = useState<string | null>(null)

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const draft: CompetitorDraft = {
      name,
      vendor,
      priority,
      region,
      posture,
      summary,
      website,
      watchUrl,
      watchLabel,
      threatNotes
    }
    if (!draft.name.trim()) {
      setError('名称必填')
      return
    }
    setError(null)
    onSubmit(draft)
  }

  return (
    <form className="form" onSubmit={submit}>
      <strong>{initial ? '编辑竞品' : '新建竞品'}</strong>
      {error ? <div className="banner error">{error}</div> : null}
      <label>
        名称
        <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="例如 Claude Cowork" />
      </label>
      <label>
        厂商
        <input value={vendor} onChange={(event) => setVendor(event.target.value)} placeholder="例如 Anthropic" />
      </label>
      <label>
        优先级
        <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
          <option value="P0">P0</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
        </select>
      </label>
      <label>
        区域
        <select value={region} onChange={(event) => setRegion(event.target.value as Region)}>
          <option value="cn">国内</option>
          <option value="global">国际</option>
        </select>
      </label>
      <label>
        姿态
        <input value={posture} onChange={(event) => setPosture(event.target.value)} placeholder="一句话定位" />
      </label>
      <label>
        摘要
        <textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="产品在做什么" />
      </label>
      <label>
        官网
        <input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://" />
      </label>
      <label>
        监控页
        <input value={watchUrl} onChange={(event) => setWatchUrl(event.target.value)} placeholder="changelog / blog URL" />
      </label>
      <label>
        监控页名称
        <input value={watchLabel} onChange={(event) => setWatchLabel(event.target.value)} placeholder="例如 更新日志" />
      </label>
      <label>
        威胁判断
        <textarea value={threatNotes} onChange={(event) => setThreatNotes(event.target.value)} />
      </label>
      <div className="form-actions">
        <button type="submit" className="primary">
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  )
}
