import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'dark' | 'light' | 'system'
export type VolumeUnit = 'oz' | 'ml'
export type MilkTypeDefault = 'BREAST_MILK' | 'FORMULA'
export type ColorBlindMode = 'none' | 'rg'

interface SettingsState {
  theme: ThemePreference
  units: VolumeUnit
  pushEnabled: boolean
  defaultMilkType: MilkTypeDefault
  colorBlindMode: ColorBlindMode
  feedingEnabled: boolean
  sleepEnabled: boolean
  setTheme: (theme: ThemePreference) => void
  setUnits: (units: VolumeUnit) => void
  setPushEnabled: (enabled: boolean) => void
  setDefaultMilkType: (type: MilkTypeDefault) => void
  setColorBlindMode: (mode: ColorBlindMode) => void
  setFeedingEnabled: (enabled: boolean) => void
  setSleepEnabled: (enabled: boolean) => void
}

// Persisted to localStorage under 'tracker-settings'. The inline script in
// index.html reads the same key before first paint to avoid a theme flash.
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      units: 'oz',
      pushEnabled: true,
      defaultMilkType: 'BREAST_MILK',
      colorBlindMode: 'none',
      feedingEnabled: true,
      sleepEnabled: true,
      setTheme: (theme) => set({ theme }),
      setUnits: (units) => set({ units }),
      setPushEnabled: (pushEnabled) => set({ pushEnabled }),
      setDefaultMilkType: (defaultMilkType) => set({ defaultMilkType }),
      setColorBlindMode: (colorBlindMode) => set({ colorBlindMode }),
      setFeedingEnabled: (feedingEnabled) => set({ feedingEnabled }),
      setSleepEnabled: (sleepEnabled) => set({ sleepEnabled }),
    }),
    { name: 'tracker-settings' },
  ),
)
