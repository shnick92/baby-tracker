import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '@test/utils'
import { useSettingsStore } from '@stores/settingsStore'

import { Dashboard } from './Dashboard'

vi.mock('@lib/axios', () => ({ api: { get: vi.fn(), patch: vi.fn() } }))
vi.mock('@stores/authStore', () => ({
  useAuthStore: () => ({ babyId: 'b1', user: { id: 'u1', name: 'Parent', hasPasskey: true } }),
}))
vi.mock('../pregnancy', () => ({
  usePregnancyStatus: () => ({ data: { born: true } }),
  PregnancyProgressWidget: () => null,
}))
vi.mock('../feeding', () => ({
  useFeedingLogs: () => ({ logs: [], isLoading: false, activeSession: null }),
}))
vi.mock('../sleep', () => ({
  useSleepLogs: () => ({ activeSession: null, lastEnded: null, isLoading: false }),
}))
vi.mock('../diaper', () => {
  const now = new Date().toISOString()
  const logs = [
    { id: 'd1', type: 'DIRTY', occurredAt: now, color: 'YELLOW' },
    { id: 'd2', type: 'WET', occurredAt: now, color: null },
  ]
  return {
    useDiaperLogs: () => ({ logs, todayLogs: logs, totalCount: 2, wetCount: 1, dirtyCount: 1, isLoading: false }),
  }
})
vi.mock('../checklist', () => ({ useChecklist: () => ({ data: undefined, isLoading: false }) }))
vi.mock('../purchases', () => ({ usePurchases: () => ({ data: undefined, isLoading: false }) }))
vi.mock('../visitors', () => ({ useVisitors: () => ({ slots: [], isLoading: false }) }))
vi.mock('../alerts', () => ({ SOSButton: () => null }))
vi.mock('../ai', () => ({ QuickLogInput: () => null, InsightsPanel: () => null }))
vi.mock('../illness', () => ({
  IllnessBanner: () => null,
  StartEpisodeSheet: () => null,
  useActiveEpisode: () => ({ data: null }),
}))
vi.mock('../illness/TempLogSheet', () => ({ TempLogSheet: () => null }))
vi.mock('../auth/AddPasskeyButton', () => ({ AddPasskeyButton: () => null }))

describe('Dashboard tracking toggles', () => {
  beforeEach(() => useSettingsStore.setState({ feedingEnabled: true, sleepEnabled: true }))

  it('shows feeding and sleep cards by default', () => {
    renderWithProviders(<Dashboard />)
    expect(screen.getAllByText('Last Feeding').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sleep Status').length).toBeGreaterThan(0)
    expect(screen.queryByText('Recent changes')).not.toBeInTheDocument()
  })

  it('hides feeding and sleep and expands the diaper card when both are off', () => {
    useSettingsStore.setState({ feedingEnabled: false, sleepEnabled: false })
    renderWithProviders(<Dashboard />)
    expect(screen.queryByText('Last Feeding')).not.toBeInTheDocument()
    expect(screen.queryByText('Sleep Status')).not.toBeInTheDocument()
    expect(screen.queryByText('Feed')).not.toBeInTheDocument()
    expect(screen.queryByText('Sleep')).not.toBeInTheDocument()
    expect(screen.getAllByText('Recent changes').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Dirty').length).toBeGreaterThan(0)
  })

  it('shows the diaper total as the number of changes', () => {
    renderWithProviders(<Dashboard />)
    expect(screen.getAllByText('2 total').length).toBeGreaterThan(0)
  })
})
