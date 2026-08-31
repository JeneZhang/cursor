import { describe, expect, it } from 'vitest'
import { nextTheme, paletteFor, parseTheme } from './theme'

describe('parseTheme', () => {
  it('defaults to dark', () => {
    expect(parseTheme(null)).toBe('dark')
    expect(parseTheme('nope')).toBe('dark')
  })

  it('accepts light', () => {
    expect(parseTheme('light')).toBe('light')
  })
})

describe('nextTheme', () => {
  it('toggles between dark and light', () => {
    expect(nextTheme('dark')).toBe('light')
    expect(nextTheme('light')).toBe('dark')
  })
})

describe('paletteFor', () => {
  it('returns distinct backgrounds per theme', () => {
    expect(paletteFor('dark').bg0).not.toBe(paletteFor('light').bg0)
    expect(paletteFor('light').player).toMatch(/^#/)
  })
})
