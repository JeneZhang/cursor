const BEST_SCORES_KEY = 'mini-2048:best-scores'

/**
 * Best scores are keyed by board size. Storage can throw in private-browsing
 * modes, so every access degrades to an in-memory-only session.
 */
export function loadBestScores(): Record<number, number> {
  try {
    const raw = window.localStorage.getItem(BEST_SCORES_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const bests: Record<number, number> = {}
    for (const [size, score] of Object.entries(parsed as Record<string, unknown>)) {
      const parsedSize = Number(size)
      if (Number.isInteger(parsedSize) && typeof score === 'number' && Number.isFinite(score)) {
        bests[parsedSize] = score
      }
    }
    return bests
  } catch {
    return {}
  }
}

export function saveBestScores(bests: Record<number, number>): void {
  try {
    window.localStorage.setItem(BEST_SCORES_KEY, JSON.stringify(bests))
  } catch {
    // Ignore: the score simply is not persisted.
  }
}
