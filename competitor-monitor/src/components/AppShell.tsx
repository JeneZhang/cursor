import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

const links = [
  { to: '/', label: '总览' },
  { to: '/feed', label: '动态' },
  { to: '/competitors', label: '竞品台账' },
  { to: '/sources', label: '监控源' }
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="masthead">
        <div className="masthead-kicker">
          <span>Office Agent Signal Desk</span>
          <span>P1 only · 2026-08-19</span>
        </div>
        <h1>办公 Agent 情报台</h1>
        <p>
          盯住直接竞品的官方更新：产品、模型、端、安全与生态。默认只看 P1，避免被编程工具和边缘产品淹没。
        </p>
      </header>
      <nav className="nav">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'}>
            {link.label}
          </NavLink>
        ))}
      </nav>
      {children}
      <footer className="footer-note">
        本地需求文档未能挂载到云端环境。本站按文件名《办公Agent竞品动态监控》实现 P1：直接竞品台账、近 30
        天动态流、筛选、影响判断与可点开的原文。P2（定时爬虫、IM 推送、自动周报）未做。
      </footer>
    </div>
  )
}
