import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

const links = [
  { to: '/', label: '总览' },
  { to: '/feed', label: '动态' },
  { to: '/competitors', label: '竞品' },
  { to: '/sources', label: '来源' }
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <header className="toolbar">
        <span className="brand">竞品动态监控</span>
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'} className="nav-link">
            {link.label}
          </NavLink>
        ))}
        <div className="path">P0 / P1 / P2</div>
      </header>
      <div className="page">{children}</div>
    </div>
  )
}
