export type ThemeMode = 'dark' | 'light'

export const THEME_KEY = 'lane-drift-theme'

export function parseTheme(value: string | null): ThemeMode {
  return value === 'light' ? 'light' : 'dark'
}

export function nextTheme(current: ThemeMode): ThemeMode {
  return current === 'dark' ? 'light' : 'dark'
}

export interface CanvasPalette {
  bg0: string
  bg1: string
  bg2: string
  star: string
  laneMid: string
  laneSide: string
  laneLine: string
  gem: string
  gemGlow: string
  gate: string
  gateStroke: string
  gateInset: string
  player: string
  playerGlow: string
  playerCore: string
  vignette: string
}

export function paletteFor(theme: ThemeMode): CanvasPalette {
  if (theme === 'light') {
    return {
      bg0: '#e8f4f1',
      bg1: '#d4ebe6',
      bg2: '#c5e0d8',
      star: '#5a8a82',
      laneMid: 'rgba(20, 140, 120, 0.08)',
      laneSide: 'rgba(20, 60, 50, 0.04)',
      laneLine: 'rgba(40, 110, 100, 0.22)',
      gem: '#c9891a',
      gemGlow: 'rgba(200, 130, 20, 0.4)',
      gate: '#6a7d8a',
      gateStroke: '#4a5c68',
      gateInset: 'rgba(255, 255, 255, 0.35)',
      player: '#1a9e7a',
      playerGlow: 'rgba(26, 158, 122, 0.4)',
      playerCore: '#ffffff',
      vignette: 'rgba(40, 80, 70, 0.18)'
    }
  }

  return {
    bg0: '#07131c',
    bg1: '#0b1f2c',
    bg2: '#102a24',
    star: '#d7f3ff',
    laneMid: 'rgba(56, 189, 160, 0.06)',
    laneSide: 'rgba(255,255,255,0.03)',
    laneLine: 'rgba(120, 200, 180, 0.18)',
    gem: '#f0b429',
    gemGlow: 'rgba(240, 180, 41, 0.55)',
    gate: '#6d7f8d',
    gateStroke: '#9eb0bf',
    gateInset: 'rgba(8, 16, 22, 0.35)',
    player: '#3fd0a8',
    playerGlow: 'rgba(63, 208, 168, 0.55)',
    playerCore: '#e8fff7',
    vignette: 'rgba(0,0,0,0.35)'
  }
}
