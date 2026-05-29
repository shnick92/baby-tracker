import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, makeClient } from '@test/utils'
import { api } from '@lib/axios'
import { INSIGHTS_MIN_FEEDINGS, INSIGHTS_MIN_SLEEPS } from '@tracker/shared'
import { InsightsPanel } from './InsightsPanel'

// @lib/axios and @stores/authStore are mocked globally in src/test/setup.ts

beforeEach(() => vi.clearAllMocks())

const SUFFICIENT_DATA = {
  feedingInterval: { avg24h: 150, avg3d: 160, avg7d: 165 },
  sleepPattern: { avgWakeWindowMin: 90, longestStretchMin: 240, avgDailySleepMin: 600 },
  summary: 'Baby is eating well and sleeping in good stretches.',
}

// Build a QueryClient pre-seeded with enough feeding and sleep data so
// useInsights' hasEnoughData gate is satisfied and the query fires.
function makeSeededClient() {
  const now = Date.now()
  const client = makeClient()

  const feedings = Array.from({ length: INSIGHTS_MIN_FEEDINGS }, (_, i) => ({
    id: `f${i}`,
    startedAt: new Date(now - i * 60 * 60 * 1000).toISOString(),
  }))
  const sleeps = Array.from({ length: INSIGHTS_MIN_SLEEPS }, (_, i) => ({
    id: `s${i}`,
    startedAt: new Date(now - (i + 1) * 3 * 60 * 60 * 1000).toISOString(),
    endedAt: new Date(now - i * 3 * 60 * 60 * 1000).toISOString(),
  }))

  client.setQueryData(['feedings', 'b1'], feedings)
  client.setQueryData(['sleepLogs', 'b1'], sleeps)
  return client
}

describe('InsightsPanel', () => {
  it('renders collapsed by default', () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: SUFFICIENT_DATA, error: null } })
    renderWithProviders(<InsightsPanel babyId="b1" />)
    expect(screen.getByText(/AI Insights/i)).toBeInTheDocument()
    expect(screen.queryByText(/Baby is eating/i)).not.toBeInTheDocument()
  })

  it('expands and shows summary on click', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: SUFFICIENT_DATA, error: null } })
    renderWithProviders(<InsightsPanel babyId="b1" />, makeSeededClient())
    await userEvent.click(screen.getByText(/AI Insights/i))
    expect(await screen.findByText(/Baby is eating well/i)).toBeInTheDocument()
  })

  it('shows stat cards when data is sufficient', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: SUFFICIENT_DATA, error: null } })
    renderWithProviders(<InsightsPanel babyId="b1" />, makeSeededClient())
    await userEvent.click(screen.getByText(/AI Insights/i))
    expect(await screen.findByText(/Feed interval/i)).toBeInTheDocument()
    expect(screen.getByText(/Longest sleep/i)).toBeInTheDocument()
  })

  it('shows insufficient-data message when cache has too few entries', async () => {
    // Empty cache → hasEnoughData false → query disabled → !data → insufficient message
    renderWithProviders(<InsightsPanel babyId="b1" />)
    await userEvent.click(screen.getByText(/AI Insights/i))
    expect(await screen.findByText(/Not enough tracking data/i)).toBeInTheDocument()
    expect(screen.queryByText(/Feed interval/i)).not.toBeInTheDocument()
    expect(vi.mocked(api.get)).not.toHaveBeenCalled()
  })

  it('shows error state when API returns an error', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))
    renderWithProviders(<InsightsPanel babyId="b1" />, makeSeededClient())
    await userEvent.click(screen.getByText(/AI Insights/i))
    expect(await screen.findByText(/unavailable/i)).toBeInTheDocument()
  })

  it('calls invalidate query when Refresh insights is clicked', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: SUFFICIENT_DATA, error: null } })
    renderWithProviders(<InsightsPanel babyId="b1" />, makeSeededClient())
    await userEvent.click(screen.getByText(/AI Insights/i))
    await screen.findByText(/Baby is eating well/i)
    await userEvent.click(screen.getByText(/Refresh insights/i))
    // Second GET call triggered by invalidation
    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(2)
  })
})
