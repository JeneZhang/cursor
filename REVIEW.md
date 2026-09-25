# 代码评审：JeneZhang/cursor

评审日期：2026-09-10。只读为主，未改生产代码。
本机已跑通：根目录 `npm test`（12）/ `npm run lint` / `npm run build`；`competitor-monitor` 的 `npm test`（3）/ `npm run build`。

---

## 1. 仓库是什么

这不是单一产品仓，而是一个 **Cursor 个人实验 / Agent benchmark 集合**：

| 部分 | 类型 | 栈 | 入口 |
| --- | --- | --- | --- |
| **Markdown Todo Desktop**（根目录） | 本机 Electron 待办 | Electron 35 + React 19 + TS strict + electron-vite + Vitest | `src/main/index.ts` → preload `window.todoApi` → `src/renderer` |
| **办公 Agent 情报台** `competitor-monitor/` | 本地 Vite 静态站 | React 19 + React Router 7 + Vite 6 | `competitor-monitor/src/main.tsx`，默认 `http://localhost:5174` |
| **今日小决定** `xiao-jue-ding/` | 教学向单页 | 原生 HTML/CSS/JS + `localStorage` | 打开 `xiao-jue-ding/index.html` |
| **云端桌面研究** `docs/cloud-desktop/` + `tools/cloud-desktop-audit/` | 文档 + 测量脚本 | Markdown / Python / bash | 只在有 `DISPLAY=:1` 的 Cloud Agent 桌面上有意义 |

根目录的 `SPEC.md` / `AGENT_PROMPT.md` / `SCORING_RUBRIC.md` 说明 **Todo 应用是按 Agent 基准规格从零搭的**，不是 SaaS。没有后端、没有登录、没有官方托管/preview URL，也没有 `.github/workflows`。

**总评：** Todo 主应用分层清楚、规格对齐、测试能绿；作为本地工具可用。仓级问题是「多产品挤一个 repo + 无 CI + 几处会弄坏 `todos.md` 的写入路径」。情报台是手工台账，不是实时监控系统。

---

## 2. 怎么跑 / 测

需要 Node.js 20+（本机验证用的是 22.14）。没有文档化的 Vercel/云端 preview。

### Markdown Todo Desktop

```bash
npm install
npm run dev          # 热重载
npm run build && npm start
npm test
npm run lint
```

macOS 是日常目标环境。Linux/Windows 能跑开发构建，但没有 `electron-builder` / `.dmg`。最后打开的路径记在 Electron `userData/prefs.json`。

### 办公 Agent 情报台

```bash
cd competitor-monitor
npm install
npm run dev          # http://localhost:5174（vite 绑 0.0.0.0）
npm test
npm run build
npm run ingest       # 把 OpenClaw releases 写成 JSON；当前没有 UI 读取该文件
```

### 今日小决定

浏览器打开 `xiao-jue-ding/index.html`，或 `python3 -m http.server 8080`。

### 云端桌面审计（仅 Cloud Agent 图形会话）

```bash
DISPLAY=:1 python3 tools/cloud-desktop-audit/audit.py --json /tmp/baseline.json
DISPLAY=:1 tools/cloud-desktop-audit/demo-desktop-session.sh --reset
```

`input` / `typing` / `settle` 会真的动鼠标打字，不要在有未保存窗口时跑。

---

## 3. 架构与质量（短评）

**Todo 应用（好的部分）**

- 分层符合 SPEC：`src/shared`（parse/write/validate）→ `src/main`（原子写 + IPC）→ `src/preload`（`contextBridge`）→ `src/renderer`（不碰磁盘）。
- `contextIsolation: true`、`nodeIntegration: false`、renderer CSP 存在。
- 写入走 temp + `rename`（Linux/macOS 原子）。
- 错误码齐全（含重复 ID 修复建议、解析行号）。
- TS `strict` + `no-explicit-any`；根目录 lint/test/build 通过。

**仓级缺口**

- 无 CI，回归全靠本地命令。
- 三个互不相关的应用 + 一篇平台研究报告，没有 workspace/monorepo 约定。
- Electron 钉在 v35，`npm audit` 报一串 Electron CVE（多数要特定 API 才打得到；本应用也没打包分发）。
- 测试只覆盖 shared/service，没有 IPC / 渲染层 / 分隔符边界。

**情报台**

- 种子数据在 `src/data/`，浏览器里只能实时拉 OpenClaw 的 GitHub Releases。
- `scripts/ingest.mjs` 写的 `live-openclaw.json` **没有被 import**。
- 默认「近 7 天」相对 `new Date()`；最新种子是 `2026-08-19`，到评审日已经 22 天，总览会显示 0。

---

## 4. 发现（按严重度）

未发现需要立刻热修的 Critical（无泄露密钥、无托管后端可注入、无已证实的远程 RCE）。

### High

| # | 问题 | 路径 | 为什么要紧 |
| --- | --- | --- | --- |
| H1 | **描述里的 `---` 会写坏文件** | `src/shared/writer/write.ts`、`src/shared/parser/parse.ts` | Writer 原样写入描述；parser 用 `\n---\n` 切块。用户加一条带 Markdown 分隔线的描述后，Reload/重开会 `ParseError`（复现：heading `after`）。文件还在磁盘上，但应用再也读不进去，等于锁死这条 `todos.md`。 |
| H2 | **标题里的换行同样锁死文件** | `src/shared/validation.ts` `normalizeTitle`、`write.ts` | `trim()` 不去内部 `\n`。写出 `## [open] Line1\nLine2 (id: …)`，下一轮解析失败。粘贴多行标题即可触发。 |
| H3 | **情报台「近 7 天 / 高影响」相对日历，种子已过期** | `competitor-monitor/src/lib/format.ts`、`src/pages/Dashboard.tsx`、`src/data/updates.ts` | 最新条目 2026-08-19，评审日 2026-09-10 已 22 天。Dashboard 会显示「近 7 天动态 = 0」。Feed 默认 30 天目前还能看到；再过约一周默认 Feed 也会空。这是监控台的主路径，看起来像坏了。 |

### Medium

| # | 问题 | 路径 | 为什么要紧 |
| --- | --- | --- | --- |
| M1 | **并发 persist 后写覆盖** | `src/main/todoService.ts` `persist()` | 每次把当时的 `this.todos` 引用交给 `saveTodos`。两次 IPC 交错时，先开始的 write 后完成，会把后一次内存变更盖掉。连点添加/删除可丢操作。 |
| M2 | **`todos:openPath` 接受任意路径** | `src/main/ipc.ts`、`src/preload/index.ts` | 渲染进程可让主进程打开任意文件。解析成功后的 Save 会按 todos 格式整文件重写。当前 UI 几乎不渲染 HTML，XSS 面小，但 preload 面偏大。 |
| M3 | **Electron `sandbox: false` + `openExternal` 无协议白名单** | `src/main/index.ts` | 与 SPEC 的隔离目标不一致。`setWindowOpenHandler` 会把任意 URL 交给 `shell.openExternal`（`file:` / 自定义协议）。现在 UI 几乎不 `window.open`，属于防御纵深。 |
| M4 | **添加成功前就清空表单** | `src/renderer/src/components/TodoForm.tsx` | `onSubmit` 不等 `handleAdd`。校验/IO 失败时标题描述已经没了。 |
| M5 | **同步 GitHub 会丢掉手工核对的 OpenClaw 条** | `competitor-monitor/src/lib/live.ts` `mergeLiveUpdates` | 去掉 **全部** `competitorId === 'openclaw'` 的种子（含安全向条目），只留 live release。和「刷新前先对原文」的产品说明打架。 |
| M6 | **Vite 监听 `0.0.0.0:5174` 且无鉴权** | `competitor-monitor/vite.config.ts` | 开发服务器对局域网开放。云端/共享机上别人能看台账。 |
| M7 | **没有 CI** | 无 `.github/workflows` | `npm test` / lint / 两个 package 的 build 都不会在 PR 上自动跑。这个仓已经在用 Cloud Agent 提 PR。 |
| M8 | **依赖审计（本地工具语境）** | 根 `package.json` `electron@^35` | `npm audit`：10 个（4 moderate / 6 high），大头是 Electron 35 与 `extract-zip`。应用未打包分发，利用面有限；要发安装包先升到当前 Electron。情报台另有 2 个 moderate（vitest mocker，仅测试）。 |
| M9 | **测试没覆盖会锁文件的输入** | `tests/parser.test.ts`、`tests/writer.test.ts` | 有合法样本和畸形 heading，但没有「应用自己写出来再读失败」的用例。H1/H2 能绿着合并。 |

### Low

| # | 问题 | 路径 | 为什么要紧 |
| --- | --- | --- | --- |
| L1 | `ingest` 输出未被读取 | `competitor-monitor/scripts/ingest.mjs` | 文档承诺离线 JSON；实现是死管道。 |
| L2 | 不校验 ISO 日期 | `src/shared/parser/parse.ts` | 垃圾 `Created:` 能进模型，排序/展示会怪。 |
| L3 | 无文件监视 | `src/main/todoService.ts` | SPEC 的 stretch。手改 `todos.md` 必须点 Reload；漏点会把外部编辑盖掉。 |
| L4 | Windows 上 `rename` 覆盖不可靠 | `src/main/storage.ts` | 规格偏 Mac；Windows 上目标已存在时 rename 常失败。 |
| L5 | 「New file」直接写成空模板 | `src/main/ipc.ts` `todos:create` | 系统保存框通常会确认覆盖；覆盖后是空 `# Todos`，旧内容没了。 |
| L6 | 情报台无 CSP；`sourceUrl` 未校验协议 | `competitor-monitor/index.html`、`UpdateCard.tsx` | 本地静态站 + 种子 URL。live `html_url` 一般是 https。 |
| L7 | 小决定用 `Math.random` + 无测试 | `xiao-jue-ding/app.js` | 教学 demo 可接受。`innerHTML = ""` 只是清空，选项走 `textContent`/`value`，XSS 风险低。 |
| L8 | `todoLogic.ts` 从 `src/shared` 再 import `../shared/...` | `src/shared/todoLogic.ts` | 能解析，但读起来像文件放错了目录。 |
| L9 | 根 README 几乎不提 `docs/cloud-desktop` | `README.md` | 新来的人会漏掉仓里最长的那份研究文档。 |

---

## 5. 建议人工先点什么

### Markdown Todo — 主路径

1. New file → 存 `todos.md` → 空列表。
2. 加「买菜」（high，`errands`）和「写报告」（`work`）。
3. 筛 status / priority / tag（AND）；搜索 `report`（此时筛选项应禁用）。
4. 打开详情，改标题，Save；Mark done → Mark open。
5. Delete，确认原生对话框。
6. 退出再开，应复用上次路径。
7. 外部改 `todos.md`，点 Reload，列表应变。

### Markdown Todo — 容易出事的边

1. **描述里只写 `---` 或中间夹分隔线** → Save → Reload。预期：现在会解析失败并把文件卡住（H1）。
2. **标题粘贴两行** → Save → Reload（H2）。
3. 打开故意缺 `Created:` / 重复 id 的文件 → banner 应带行号或修复建议。
4. 搜索生效时改筛选项，应保持禁用且不影响当前搜索结果。
5. 连点 Add 两次 → `todos.md` 是否两条都在（M1）。
6. 手改磁盘后 **不** Reload 就再 Save → 外部编辑应被规范重写清掉（已知行为，README 写了）。

### 情报台 — 主路径

1. `/` 总览数字和「本周高影响」。今天大概率是空的（H3）——先确认是数据过期，不是路由坏了。
2. `/feed`：竞品 / 类型 / 影响 / 时间 / 关键词；点一条「原文」。
3. 「同步 OpenClaw GitHub」：成功、限流（未认证 API）、失败 banner。
4. 同步后再看 OpenClaw：种子安全条应被 live release 换掉（M5）。
5. `/competitors/:id`、`/sources` 外链。把 priority 调到 `all` 才会看到默认隐藏的 Manus（P2）。

### 今日小决定

1. 留默认 3 项，点「帮我选一个」，看动画和结果。
2. 加到 6、减到 2；按钮应 disable。
3. 只填 1 项 → 错误文案。
4. 刷新：选项应从 `localStorage` 回来。

### 不要当产品回归的

`tools/cloud-desktop-audit/*` 是测 Cursor 云桌面的，会抢指针。只有在改那份研究/脚本时再跑。

---

## 6. 建议下手顺序

1. **H1/H2（Todo）：** 写之前拒绝或转义标题换行和描述里的 `\n---\n`；加 round-trip 测试。这是唯一会让用户自己把数据文件打到应用打不开的路径。
2. **H3（情报台）：** 种子日期跟着「今天」走，或总览改成「最新 N 条」而不是滚动 7 天窗口。
3. **M7：** 一个 GitHub Actions workflow：根目录和 `competitor-monitor` 的 `npm test` + build。
4. **M5/L1：** 要么读 ingest 的 JSON，要么同步时合并而不是丢掉 OpenClaw 种子。
5. **M2/M3：** `openPath` 只接受上次 prefs / 系统对话框选中的路径；`openExternal` 限 `https:`；能开 sandbox 就开。
6. 只有打算分发安装包时，再把 Electron 升出 v35 审计名单。

**这次没改生产代码：** H1/H2 修起来要动格式约定和测试，不是可以放心落地的一行补丁。没有发现已泄露的密钥或明显可远程打的洞。
