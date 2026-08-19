import type { WatchSource } from '../types'

export const SOURCES: WatchSource[] = [
  {
    id: 'claude-blog',
    competitorId: 'claude-cowork',
    label: 'Anthropic Blog',
    url: 'https://claude.com/blog',
    cadence: '随发布'
  },
  {
    id: 'claude-notes',
    competitorId: 'claude-cowork',
    label: 'Claude Release notes',
    url: 'https://support.claude.com/en/articles/12138966-release-notes',
    cadence: '周更'
  },
  {
    id: 'trae-changelog',
    competitorId: 'trae-work',
    label: 'TraeWork 更新日志',
    url: 'https://docs.trae.cn/work_changelog',
    cadence: '近乎日更'
  },
  {
    id: 'kimi-notes',
    competitorId: 'kimi-work',
    label: 'Kimi Work 发布日志',
    url: 'https://www.kimi.com/zh-hans/help/kimi-work/release-notes',
    cadence: '近乎日更'
  },
  {
    id: 'openclaw-gh',
    competitorId: 'openclaw',
    label: 'OpenClaw GitHub Releases',
    url: 'https://github.com/openclaw/openclaw/releases',
    cadence: '随 tag；可自动同步'
  },
  {
    id: 'ms-roadmap',
    competitorId: 'ms-copilot',
    label: 'Microsoft 365 Roadmap',
    url: 'https://www.microsoft.com/microsoft-365/roadmap',
    cadence: '周更'
  },
  {
    id: 'google-blog',
    competitorId: 'gemini-spark',
    label: 'Google Blog',
    url: 'https://blog.google',
    cadence: '随发布'
  },
  {
    id: 'qwen-site',
    competitorId: 'qwen-office',
    label: '千问办公 / 新闻稿',
    url: 'https://www.qianwen.com',
    cadence: '随发布'
  },
  {
    id: 'doubao-site',
    competitorId: 'doubao',
    label: '豆包电脑版更新',
    url: 'https://www.doubao.com',
    cadence: '随客户端'
  },
  {
    id: 'genspark-site',
    competitorId: 'genspark',
    label: 'Genspark 官网',
    url: 'https://www.genspark.ai',
    cadence: '随发布'
  }
]
