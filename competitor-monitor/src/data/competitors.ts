import type { Competitor } from '../types'

export const COMPETITORS: Competitor[] = [
  {
    id: 'claude-cowork',
    name: 'Claude Cowork',
    vendor: 'Anthropic',
    priority: 'P1',
    region: 'global',
    posture: '桌面 Agent，正在扩到浏览器 / Web / 手机',
    summary:
      '把 Claude Code 的长任务执行能力做成面向知识工作的桌面智能体。本地文件、定时任务、Chrome 侧栏与账号级远程会话是当前主攻方向。',
    website: 'https://claude.com',
    watchUrl: 'https://claude.com/blog',
    watchLabel: 'Anthropic Blog',
    threatNotes: '模型与长程执行最强的直接竞品。若补齐中文生态与降价，会直接切高端办公用户。'
  },
  {
    id: 'trae-work',
    name: 'TraeWork',
    vendor: '字节跳动',
    priority: 'P1',
    region: 'cn',
    posture: 'Work / Code 双模式办公工作台',
    summary:
      '字节面向企业办公的 AI 工作台，桌面版与网页版同步迭代。近期补了办公助理、Design 模式、记忆与企业 Hook。',
    website: 'https://www.trae.ai',
    watchUrl: 'https://docs.trae.cn/work_changelog',
    watchLabel: 'TraeWork 更新日志',
    threatNotes: '最可能复刻腾讯「生态入口 + 办公 Agent」打法的国内对手。'
  },
  {
    id: 'kimi-work',
    name: 'Kimi Work',
    vendor: '月之暗面',
    priority: 'P1',
    region: 'cn',
    posture: '本地工作区 + Agent 浏览器',
    summary:
      'Kimi 的桌面办公 Agent。长会话、文件 diff、技能市场和内置浏览器是产品主线，迭代节奏按天到周。',
    website: 'https://www.kimi.com/products/kimi-work',
    watchUrl: 'https://www.kimi.com/zh-hans/help/kimi-work/release-notes',
    watchLabel: 'Kimi Work 发布日志',
    threatNotes: '产品完成度高、更新极快，和 WorkBuddy 抢同一类「把电脑交给 Agent」用户。'
  },
  {
    id: 'qwen-office',
    name: '千问办公',
    vendor: '阿里巴巴',
    priority: 'P1',
    region: 'cn',
    posture: '桌面 + 云端 + 企业协同三形态',
    summary:
      '阿里 B 端办公 Agent 产品线，8 月 3 日公测。强调跨系统审批、多角色协同，并快速接入国产旗舰模型。',
    website: 'https://www.qianwen.com',
    watchUrl: 'https://www.qianwen.com',
    watchLabel: '千问办公官网',
    threatNotes: '钉钉 / 阿里云企业关系是其壁垒。模型组合策略会直接影响企业选型对比表。'
  },
  {
    id: 'doubao',
    name: '豆包工作任务',
    vendor: '字节跳动',
    priority: 'P1',
    region: 'cn',
    posture: '超级 App 内的电脑操作 Agent',
    summary:
      '豆包电脑版把「工作任务」做成可在虚拟桌面里操作 Windows 的 GUI Agent，不抢用户键鼠，覆盖无 API 的软件。',
    website: 'https://www.doubao.com',
    watchUrl: 'https://www.doubao.com',
    watchLabel: '豆包官网',
    threatNotes: '3.8 亿月活分发能力是最大威胁。GUI 操作电脑会降低用户迁移到独立办公 Agent 的必要性。'
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    vendor: '开源社区',
    priority: 'P1',
    region: 'global',
    posture: '本地 Agent 操作系统 / 技能生态',
    summary:
      '开源 Agent 框架，技能插件数量巨大。WorkBuddy 兼容其 skills，但社区迭代会持续抬高「能做什么」的基准。',
    website: 'https://github.com/openclaw/openclaw',
    watchUrl: 'https://github.com/openclaw/openclaw/releases',
    watchLabel: 'GitHub Releases',
    threatNotes: '教育市场并定义 skills 标准。安全与门槛是其弱点，也是 WorkBuddy 的差异化切口。'
  },
  {
    id: 'ms-copilot',
    name: 'Microsoft 365 Copilot',
    vendor: 'Microsoft',
    priority: 'P1',
    region: 'global',
    posture: 'Office 套件内的企业 Agent',
    summary:
      '深度嵌在 Word / Excel / PowerPoint / Outlook / Teams。近期补连接器新鲜度、Planner Agent、Word 内 Anthropic 模型。',
    website: 'https://www.microsoft.com/microsoft-365/copilot',
    watchUrl: 'https://www.microsoft.com/microsoft-365/roadmap',
    watchLabel: 'Microsoft 365 Roadmap',
    threatNotes: '海外企业默认选项。对已使用 M365 的客户，WorkBuddy 很难从套件内部把它替换掉。'
  },
  {
    id: 'gemini-spark',
    name: 'Gemini Spark',
    vendor: 'Google',
    priority: 'P1',
    region: 'global',
    posture: '云端常驻 Agent，接 Workspace',
    summary:
      'Google I/O 2026 发布的个人云端 Agent，持续运行、接 Gmail/Chat 与 30+ MCP 工具，不依赖本地常开电脑。',
    website: 'https://gemini.google.com',
    watchUrl: 'https://blog.google',
    watchLabel: 'Google Blog',
    threatNotes: '「人走任务不停」是 Claude Cowork 和 WorkBuddy 定时任务都在追的能力。Workspace 捆绑力强。'
  },
  {
    id: 'genspark',
    name: 'Genspark GenOffice',
    vendor: 'Genspark',
    priority: 'P1',
    region: 'global',
    posture: '免费开源的 AI Native Office 入口',
    summary:
      '8 月 3 日发布 GenOffice Alpha：本地 Word/PPT 客户端，免费开源，想抢办公人群的第一工作入口。',
    website: 'https://www.genspark.ai',
    watchUrl: 'https://www.genspark.ai',
    watchLabel: 'Genspark 官网',
    threatNotes: '用免费 Office 入口换 Agent 使用习惯。若文档质量起来，会分流「先打开文档再叫 AI」的用户。'
  },
  {
    id: 'qclaw',
    name: 'QClaw',
    vendor: '腾讯电脑管家',
    priority: 'P1',
    region: 'cn',
    posture: '基于 OpenClaw 的一键安装桌面 Agent',
    summary:
      '腾讯内部另一条办公 Agent 线：免费、微信可连、走开源框架。与 WorkBuddy 存在定位重叠，需持续对照。',
    website: 'https://guanjia.qq.com',
    watchUrl: 'https://guanjia.qq.com',
    watchLabel: '电脑管家',
    threatNotes: '同公司产品。P1 监控重点是功能边界是否继续逼近 WorkBuddy 的企业/深度办公场景。'
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT 桌面客户端',
    vendor: 'OpenAI',
    priority: 'P1',
    region: 'global',
    posture: 'Chat + Work + Codex 三合一桌面 Agent',
    summary:
      '2026 年 7 月 9 日，新版 ChatGPT 桌面端在 macOS / Windows 上把 Chat（对话）、Work（调研与交付物）和 Codex（软件开发）收进同一个应用。Work 经授权可使用本地文件和桌面应用，并带内置浏览器；旧版桌面端改名为 ChatGPT Classic。Linux 预览版已放出。',
    website: 'https://chatgpt.com/download',
    watchUrl: 'https://help.openai.com/en/articles/6825453-release-notes',
    watchLabel: 'ChatGPT Release Notes',
    threatNotes:
      '全球默认入口。桌面端已能做本地文件、电脑操作、跨端续跑，并从 Claude Cowork / Cursor 导入 skills 与项目。品牌与分发都强于大多数办公 Agent，应至少按 P1 盯；若你们对标「电脑上的默认 AI 同事」，可升到 P0。'
  },
  {
    id: 'manus',
    name: 'Manus',
    vendor: 'Meta（收购）',
    priority: 'P2',
    region: 'global',
    posture: '云端通用 Agent，先发后衰',
    summary: '早期现象级云端 Agent，高定价且切割中国市场。P2 观察即可，不作为本周主监控。',
    website: 'https://manus.im',
    watchUrl: 'https://manus.im',
    watchLabel: 'Manus 官网',
    threatNotes: '对中国办公市场直接压力有限，保留在台账中防止误判回潮。'
  }
]

export const competitorById = Object.fromEntries(COMPETITORS.map((item) => [item.id, item]))
