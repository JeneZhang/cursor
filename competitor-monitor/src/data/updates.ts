import type { UpdateItem } from '../types'

export const UPDATES: UpdateItem[] = [
  {
    id: 'kimi-320',
    competitorId: 'kimi-work',
    publishedAt: '2026-08-19',
    kind: 'feature',
    impact: 'high',
    title: 'Kimi Work 3.2.0：内置 Agent 浏览器，客户端扩到 16 种语言',
    summary:
      '浏览器标签绑定会话并落在预览区，Agent 可直接点击、输入。Mac 可导入 Chrome Cookie 复用登录态。WebBridge 改为默认关闭的插件。',
    whyItMatters:
      '「会话内嵌浏览器 + 复用登录」是办公 Agent 完成跨站任务的关键能力。WorkBuddy 需要对齐浏览器控制与登录态策略。',
    sourceLabel: 'Kimi Work 发布日志',
    sourceUrl: 'https://www.kimi.ai/help/kimi-work/release-notes'
  },
  {
    id: 'doubao-virtual-desktop',
    competitorId: 'doubao',
    publishedAt: '2026-08-18',
    kind: 'product',
    impact: 'high',
    title: '豆包「工作任务」上线虚拟桌面，可 GUI 操作 Windows',
    summary:
      '在独立虚拟环境中看屏幕、动键鼠，不占用用户当前键鼠。无需 MCP/API/插件也能操作没有接口的软件和网页。',
    whyItMatters:
      '字节把电脑操作能力塞进超大分发入口。这是对独立桌面 Agent 最直接的替代，而不是又一个聊天功能。',
    sourceLabel: '网易智能',
    sourceUrl: 'https://www.163.com/tech/article/L4KDOOB200098IEO.html'
  },
  {
    id: 'qwen-glm-ds',
    competitorId: 'qwen-office',
    publishedAt: '2026-08-16',
    kind: 'model',
    impact: 'high',
    title: '千问办公上线 GLM-5.3 与 DeepSeek V4 Pro',
    summary:
      '公测两周内形成 Qwen3.8-Max + GLM-5.3 + DeepSeek V4 Pro 三旗舰组合。DeepSeek V4 Pro 宣传 100 万上下文。后续规划独立 App 与国际版。',
    whyItMatters:
      '企业选型会直接比「能换哪些国产旗舰模型」。WorkBuddy 的多模型路由需要保持同等可见的旗舰组合。',
    sourceLabel: 'DoNews',
    sourceUrl: 'https://www.donews.com/news/detail/4/6672734.html'
  },
  {
    id: 'kimi-319',
    competitorId: 'kimi-work',
    publishedAt: '2026-08-15',
    kind: 'ecosystem',
    impact: 'medium',
    title: 'Kimi Work 个人插件市场开放',
    summary: '插件市场新增「个人插件」分区，可浏览并安装个人开发者插件。',
    whyItMatters: '技能/插件供给开始从官方清单转向双边市场，生态速度会加快。',
    sourceLabel: 'Kimi Work 发布日志',
    sourceUrl: 'https://www.kimi.ai/help/kimi-work/release-notes'
  },
  {
    id: 'openclaw-2026-8-1',
    competitorId: 'openclaw',
    publishedAt: '2026-08-15',
    kind: 'security',
    impact: 'medium',
    title: 'OpenClaw 2026.8.1-beta.2：密钥出站绑定、SQLite 备份、macOS 多实例',
    summary:
      '共享密钥必须绑定明确 HTTPS 目标主机；插件安装对任意可执行来源要求 --force；新增 GPT-5.6 Ultra 运行时切换与 sqlite 备份命令。',
    whyItMatters:
      '开源侧在补企业才会关心的密钥治理与安装溯源。WorkBuddy 若宣传「比 OpenClaw 更安全」，需要对齐这些具体能力点。',
    sourceLabel: 'GitHub Releases',
    sourceUrl: 'https://github.com/openclaw/openclaw/releases/tag/v2026.8.1-beta.2'
  },
  {
    id: 'claude-chrome-cowork',
    competitorId: 'claude-cowork',
    publishedAt: '2026-08-12',
    kind: 'channel',
    impact: 'high',
    title: 'Chrome 侧栏变为 Claude Cowork 会话，可跨端续跑',
    summary:
      'Claude in Chrome 侧栏不再是孤立会话。浏览器里开始的任务可在桌面 / Web / 手机接着做。Max 与 Team 先开，Pro 随后，Enterprise 默认关闭。',
    whyItMatters:
      'Cowork 从「一台电脑上的 Agent」变成账号级工作会话。浏览器控制 + 跨端续跑是办公 Agent 的下一张必答题。',
    sourceLabel: 'Anthropic Blog',
    sourceUrl: 'https://claude.com/blog/cowork-chrome-side-panel'
  },
  {
    id: 'ms-copilot-aug11',
    competitorId: 'ms-copilot',
    publishedAt: '2026-08-11',
    kind: 'enterprise',
    impact: 'medium',
    title: 'M365 Copilot：连接器并行抓取、Planner Agent、Word 可用 Anthropic 模型',
    summary:
      '内容抓取与身份抓取并行以提升新鲜度；Outlook 会议准备与教练；PowerPoint 生成增强；Copilot 积分可追踪。',
    whyItMatters: '微软在用套件内 Agent 和多模型（含 Anthropic）锁住企业工作流，而不是做一个独立桌面入口。',
    sourceLabel: 'Microsoft Copilot 更新汇编',
    sourceUrl: 'https://releasebot.io/updates/microsoft/microsoft-copilot'
  },
  {
    id: 'kimi-318',
    competitorId: 'kimi-work',
    publishedAt: '2026-08-11',
    kind: 'feature',
    impact: 'medium',
    title: 'Kimi Work 3.1.8：会话分支、文件 diff 回滚、技能发现',
    summary:
      '长会话消息导航、任意回合开分支、编辑重发、项目文件夹、Agent 改文件后出 diff 卡片并可一键回滚。',
    whyItMatters: '文件改动可审计、可回滚是企业愿意把本地文件交给 Agent 的前提。',
    sourceLabel: 'Kimi Work 发布日志',
    sourceUrl: 'https://www.kimi.ai/help/kimi-work/release-notes'
  },
  {
    id: 'trae-office-assistant',
    competitorId: 'trae-work',
    publishedAt: '2026-08-07',
    kind: 'feature',
    impact: 'medium',
    title: 'TraeWork v0.1.44–0.1.46：办公助理、对话分享、插件自动推荐',
    summary: '桌面版与网页版同步。输入区「+」整合附件与斜杠命令，灰度插件推荐，上线办公助理。',
    whyItMatters: '字节在把 Trae 从 IDE 明确拉向办公工作台，产品叙事已经和 WorkBuddy 同场。',
    sourceLabel: 'TraeWork 更新日志',
    sourceUrl: 'https://docs.trae.cn/work_changelog'
  },
  {
    id: 'claude-plugin-scan',
    competitorId: 'claude-cowork',
    publishedAt: '2026-08-06',
    kind: 'security',
    impact: 'medium',
    title: 'Claude 企业版上线 Skill / 插件安全扫描（beta）',
    summary: '第三方 skill 与插件在上传或编辑时可自动扫描恶意内容，面向 Enterprise。',
    whyItMatters: '技能生态一扩大，安全扫描就会变成企业采购清单项。',
    sourceLabel: 'Claude Release notes',
    sourceUrl: 'https://support.claude.com/en/articles/12138966-release-notes'
  },
  {
    id: 'qwen-beta',
    competitorId: 'qwen-office',
    publishedAt: '2026-08-03',
    kind: 'product',
    impact: 'high',
    title: '千问办公启动公测：桌面 Agent + 云端 Agent + 企业协同 Agent',
    summary: '对外宣传为业内首款同时覆盖三种形态的办公 Agent。个人与企业均可从官网体验。',
    whyItMatters: '阿里正式把办公 Agent 从通义聊天里拆成 B 端产品线，进入直接竞品名单。',
    sourceLabel: 'DoNews',
    sourceUrl: 'https://www.donews.com/news/detail/4/6672734.html'
  },
  {
    id: 'genspark-genoffice',
    competitorId: 'genspark',
    publishedAt: '2026-08-03',
    kind: 'product',
    impact: 'medium',
    title: 'Genspark 发布 GenOffice Alpha：免费开源的本地 AI Office',
    summary:
      'Windows / Mac 本地客户端，保留文档编辑，把 AI 做到 Word/PPT 高频入口。官方称一名工程师一周做出 Alpha。',
    whyItMatters: '如果「打开文档」这个入口被抢走，桌面 Agent 会变成第二打开的应用。',
    sourceLabel: '腾讯新闻',
    sourceUrl: 'https://news.qq.com/rain/a/20260803A09J9500'
  },
  {
    id: 'kimi-316',
    competitorId: 'kimi-work',
    publishedAt: '2026-07-29',
    kind: 'feature',
    impact: 'medium',
    title: 'Kimi Work 3.1.6：工作区内编辑 PPT，截图批注直接发给 Agent',
    summary: '幻灯片在工作区即时编辑；预览区与浏览器支持截图批注；Windows 支持迁移数据盘与自定义安装路径。',
    whyItMatters: 'PPT 是办公交付物核心。谁能在 Agent 工作流里原地改稿，谁就更像「办公」而不是「聊天」。',
    sourceLabel: 'Kimi Work 发布日志',
    sourceUrl: 'https://www.kimi.ai/help/kimi-work/release-notes'
  },
  {
    id: 'claude-opus5',
    competitorId: 'claude-cowork',
    publishedAt: '2026-07-24',
    kind: 'model',
    impact: 'medium',
    title: 'Claude Opus 5 发布，定位接近 Fable 5、价格减半',
    summary: 'Anthropic 称 Opus 5 接近 Fable 5 的前沿智力，售价约为后者一半，面向主动、长任务场景。',
    whyItMatters: 'Cowork 的体验上限绑在 Claude 模型上。价格下探会扩大它在企业知识工作中的用量。',
    sourceLabel: 'Claude Release notes',
    sourceUrl: 'https://support.claude.com/en/articles/12138966-release-notes'
  },
  {
    id: 'claude-web-mobile',
    competitorId: 'claude-cowork',
    publishedAt: '2026-07-07',
    kind: 'channel',
    impact: 'high',
    title: 'Claude Cowork 登陆 Web 与手机：电脑合上任务继续跑',
    summary:
      '会话与文件跟账号走。定时任务不要求设备在线。Chat 与 Cowork 共用主页。从 Max 开始灰度。',
    whyItMatters:
      '远程续跑是办公 Agent 从「电脑助手」变成「同事」的分水岭。WorkBuddy 的 IM 遥控需要对照这一体验。',
    sourceLabel: 'Anthropic Blog',
    sourceUrl: 'https://claude.com/blog/cowork-web-mobile'
  },
  {
    id: 'claude-m365-write',
    competitorId: 'claude-cowork',
    publishedAt: '2026-07-07',
    kind: 'enterprise',
    impact: 'medium',
    title: 'Claude 的 Microsoft 365 连接器开放写入',
    summary: '可起草/发送邮件、管日历、改 OneDrive 与 SharePoint 文件。Teams 仍只读。需 Entra 管理员同意。',
    whyItMatters: 'Cowork 正在嵌进微软办公栈。这会抬高「只做腾讯生态」产品在跨国企业里的替换成本叙事。',
    sourceLabel: 'Claude Release notes',
    sourceUrl: 'https://support.claude.com/en/articles/12138966-release-notes'
  }
]
