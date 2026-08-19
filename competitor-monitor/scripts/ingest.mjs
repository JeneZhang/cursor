#!/usr/bin/env node
/**
 * Pull OpenClaw GitHub releases into src/data/live-openclaw.json
 * so the dashboard can be rebuilt without a live GitHub call.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const out = join(root, '../src/data/live-openclaw.json')

const response = await fetch('https://api.github.com/repos/openclaw/openclaw/releases?per_page=8', {
  headers: { Accept: 'application/vnd.github+json' }
})

if (!response.ok) {
  console.error(`GitHub responded ${response.status}`)
  process.exit(1)
}

const releases = await response.json()
const compact = releases.map((release) => ({
  id: release.id,
  name: release.name,
  tag: release.tag_name,
  url: release.html_url,
  publishedAt: release.published_at,
  prerelease: release.prerelease,
  excerpt: String(release.body || '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('- '))
}))

writeFileSync(out, `${JSON.stringify(compact, null, 2)}\n`)
console.log(`Wrote ${compact.length} releases to src/data/live-openclaw.json`)
