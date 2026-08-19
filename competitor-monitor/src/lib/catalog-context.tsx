import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { COMPETITORS } from '../data/competitors'
import { applyDraft, loadCompetitors, saveCompetitors, sortCompetitors } from './catalog'
import type { Competitor, CompetitorDraft, Priority } from '../types'

interface CatalogValue {
  competitors: Competitor[]
  byId: Record<string, Competitor>
  add: (draft: CompetitorDraft) => string
  update: (id: string, draft: CompetitorDraft) => void
  setPriority: (id: string, priority: Priority) => void
  reset: () => void
}

const CatalogContext = createContext<CatalogValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [competitors, setCompetitors] = useState<Competitor[]>(() => loadCompetitors(COMPETITORS))

  const value = useMemo<CatalogValue>(() => {
    function persist(next: Competitor[]) {
      const sorted = sortCompetitors(next)
      saveCompetitors(sorted)
      setCompetitors(sorted)
    }

    return {
      competitors,
      byId: Object.fromEntries(competitors.map((item) => [item.id, item])),
      add(draft) {
        const result = applyDraft(competitors, null, draft)
        persist(result.items)
        return result.id
      },
      update(id, draft) {
        persist(applyDraft(competitors, id, draft).items)
      },
      setPriority(id, priority) {
        persist(competitors.map((item) => (item.id === id ? { ...item, priority } : item)))
      },
      reset() {
        persist(COMPETITORS)
      }
    }
  }, [competitors])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog(): CatalogValue {
  const value = useContext(CatalogContext)
  if (!value) throw new Error('useCatalog must be used within CatalogProvider')
  return value
}
