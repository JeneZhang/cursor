import type { UpdateItem } from '../types'

interface GithubRelease {
  id: number
  name: string | null
  tag_name: string
  html_url: string
  published_at: string | null
  prerelease: boolean
  body: string | null
}

function firstParagraph(body: string | null): string {
  if (!body) return 'OpenClaw 发布了新版本，详见 GitHub Release。'
  const lines = body
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim())
    .filter((line) => line && !line.startsWith('<') && line.length > 24)
  return (lines[0] ?? body).slice(0, 220)
}

export async function fetchOpenClawUpdates(signal?: AbortSignal): Promise<UpdateItem[]> {
  const response = await fetch('https://api.github.com/repos/openclaw/openclaw/releases?per_page=5', {
    headers: { Accept: 'application/vnd.github+json' },
    signal
  })
  if (!response.ok) {
    throw new Error(`GitHub ${response.status}`)
  }
  const releases = (await response.json()) as GithubRelease[]
  return releases.map((release) => {
    const publishedAt = (release.published_at ?? '').slice(0, 10)
    return {
      id: `openclaw-live-${release.id}`,
      competitorId: 'openclaw',
      publishedAt,
      kind: 'product' as const,
      impact: release.prerelease ? ('low' as const) : ('medium' as const),
      title: `${release.name || release.tag_name}${release.prerelease ? '（预发布）' : ''}`,
      summary: firstParagraph(release.body),
      whyItMatters: '开源框架的发版节奏决定 skills / 安全基线。此条由 GitHub Releases 实时同步。',
      sourceLabel: 'GitHub Releases（实时）',
      sourceUrl: release.html_url
    }
  })
}

export function mergeLiveUpdates(base: UpdateItem[], live: UpdateItem[]): UpdateItem[] {
  const withoutSeedOpenclaw = base.filter((item) => item.competitorId !== 'openclaw')
  return [...withoutSeedOpenclaw, ...live]
}
