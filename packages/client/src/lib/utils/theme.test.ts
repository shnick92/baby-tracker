import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveTheme, applyTheme, applyColorBlindMode, THEME_COLORS } from './theme'
import { formatVolume } from './formatTime'

describe('resolveTheme', () => {
  it('returns the explicit preference regardless of system theme', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('follows the system preference when set to system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})

describe('applyTheme', () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="theme-color" content="#111827" />'
    document.documentElement.classList.add('dark')
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  })

  it('removes the dark class and updates theme-color for light', () => {
    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(THEME_COLORS.light)
  })

  it('adds the dark class and updates theme-color for dark', () => {
    document.documentElement.classList.remove('dark')
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(THEME_COLORS.dark)
  })

  it('resolves system to the OS preference', () => {
    applyTheme('system') // matchMedia mocked to prefer light
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})

describe('applyColorBlindMode', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('cb-rg')
  })

  it('adds cb-rg class when mode is rg', () => {
    applyColorBlindMode('rg')
    expect(document.documentElement.classList.contains('cb-rg')).toBe(true)
  })

  it('removes cb-rg class when mode is none', () => {
    document.documentElement.classList.add('cb-rg')
    applyColorBlindMode('none')
    expect(document.documentElement.classList.contains('cb-rg')).toBe(false)
  })
})

describe('formatVolume', () => {
  it('formats oz with existing formatOz behaviour', () => {
    expect(formatVolume(3, 'oz')).toBe('3 oz')
    expect(formatVolume(3.5, 'oz')).toBe('3.5 oz')
  })

  it('converts to rounded ml', () => {
    expect(formatVolume(1, 'ml')).toBe('30 ml')
    expect(formatVolume(3.5, 'ml')).toBe('104 ml')
  })
})
