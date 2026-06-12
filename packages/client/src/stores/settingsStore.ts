import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'dark' | 'light' | 'system'
export type VolumeUnit = 'oz' | 'ml'

interface SettingsState {
  theme: ThemePreference
  units: VolumeUnit
  pushEnabled: boolean
  setTheme: (theme: ThemePreference) => void
  setUnits: (units: VolumeUnit) => void
  setPushEnabled: (enabled: boolean) => void
}

// Persisted to localStorage under 'tracker-settings'. The inline script in
// index.html reads the same key before first paint to avoid a theme flash.
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      units: 'oz',
      pushEnabled: true,
      setTheme: (theme) => set({ theme }),
      setUnits: (units) => set({ units }),
      setPushEnabled: (pushEnabled) => set({ pushEnabled }),
    }),
    { name: 'tracker-settings' },
  ),
)
