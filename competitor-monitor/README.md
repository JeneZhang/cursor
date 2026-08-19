# 竞品动态监控（P1）

监控**办公 Agent 直接竞品**的最新公开更新。先做 P1：台账、动态流、筛选、竞品详情、原文链接。

本地需求文档路径 `办公Agent竞品动态监控-需求文档.md` 不在这台云端机器上。实现按该文件名与常见 P1 范围落地：只盯直接竞品，不铺编程 IDE 和自动推送。

## P1 范围

- **总览**：P1 竞品数、近 7 天动态、高影响条数
- **动态流**：按竞品 / 类型 / 影响 / 时间 / 关键词筛选
- **竞品台账与详情**：产品姿态、威胁判断、相关动态
- **监控源**：官方 changelog、博客、GitHub Releases
- **同步**：动态页可拉取 OpenClaw 的 GitHub Releases（浏览器可直接访问 GitHub API）

## P1 竞品

Claude Cowork、TraeWork、Kimi Work、千问办公、豆包工作任务、OpenClaw、Microsoft 365 Copilot、Gemini Spark、Genspark GenOffice、QClaw。

Manus 放在 P2，默认隐藏。

## 未做（P2）

定时全站爬虫、企微/飞书推送、自动周报、语义去重。

## 运行

需要 Node.js 20+。

```bash
cd competitor-monitor
npm install
npm run dev
```

打开提示的本地地址（默认 `http://localhost:5174`）。

```bash
npm test
npm run build
npm run ingest   # 可选：把 OpenClaw releases 写到 JSON
```

## 数据

种子数据在 `src/data/`，条目带来源 URL 与「为何要紧」。刷新前先核对原文，不要把二手摘要当事实。
