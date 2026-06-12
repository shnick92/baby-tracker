import type { ThemePreference } from '@stores/settingsStore'

export const THEME_COLORS = { dark: '#111827', light: '#ffffff' } as const

// Pure resolver — exported for tests.
export function resolveTheme(pref: ThemePreference, systemPrefersDark: boolean): 'dark' | 'light' {
  if (pref === 'system') return systemPrefersDark ? 'dark' : 'light'
  return pref
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// Applies the resolved theme to <html> and the PWA theme-color meta tag.
export function applyTheme(pref: ThemePreference): void {
  const resolved = resolveTheme(pref, systemPrefersDark())
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[resolved])
}

// Re-applies on OS theme change while pref is 'system'. Returns a cleanup fn.
export function watchSystemTheme(pref: ThemePreference): () => void {
  if (pref !== 'system') return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => applyTheme(pref)
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
