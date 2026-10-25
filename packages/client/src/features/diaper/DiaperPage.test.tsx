import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@test/utils'
import { api } from '@lib/axios'
import { DiaperPage } from './DiaperPage'

vi.mock('@lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@lib/socket', () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }))
vi.mock('@stores/authStore', () => ({
  useAuthStore: () => ({ babyId: 'b1', user: { name: 'Nick' } }),
}))
const activeEpisode = vi.hoisted(() => ({ current: null as { startedAt: string } | null }))
vi.mock('@features/illness', () => ({
  useActiveEpisode: () => ({ data: activeEpisode.current }),
}))

const emptyResponse = { data: { data: [], error: null } }

describe('DiaperPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    activeEpisode.current = null
  })

  it('renders the three type buttons', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    renderWithProviders(<DiaperPage />)
    expect(await screen.findByText('Wet')).toBeInTheDocument()
    expect(screen.getByText('Dirty')).toBeInTheDocument()
    expect(screen.getByText(/wet \+ dirty/i)).toBeInTheDocument()
  })

  it('logs a wet diaper immediately on tap without showing a detail panel', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'd1', type: 'WET' }, error: null } })
    renderWithProviders(<DiaperPage />)
    await screen.findByText('Wet')
    await userEvent.click(screen.getByText('Wet'))
    expect(api.post).toHaveBeenCalledWith('/api/diaper', { babyId: 'b1', type: 'WET' })
    expect(screen.queryByText('Color')).not.toBeInTheDocument()
  })

  it('shows color and consistency selectors when Dirty is tapped', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    renderWithProviders(<DiaperPage />)
    await screen.findByText('Dirty')
    await userEvent.click(screen.getByText('Dirty'))
    expect(screen.getByText('Color')).toBeInTheDocument()
    expect(screen.getByText('Consistency')).toBeInTheDocument()
    expect(screen.getByText('Log Dirty Diaper')).toBeInTheDocument()
  })

  it('shows today\'s diaper count when logs exist', async () => {
    const now = new Date().toISOString()
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [
          { id: 'd1', type: 'WET', occurredAt: now, color: null, consistency: null },
          { id: 'd2', type: 'DIRTY', occurredAt: now, color: 'YELLOW', consistency: null },
        ],
        error: null,
      },
    })
    renderWithProviders(<DiaperPage />)
    expect(await screen.findByText('Today · 2 changes')).toBeInTheDocument()
    // Count strip + day group header
    expect(screen.getAllByText('Today')).toHaveLength(2)
  })

  it('counts a wet + dirty change once in the daily total', async () => {
    const now = new Date().toISOString()
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [
          { id: 'd1', type: 'BOTH', occurredAt: now, color: null, consistency: null },
          { id: 'd2', type: 'WET', occurredAt: now, color: null, consistency: null },
        ],
        error: null,
      },
    })
    renderWithProviders(<DiaperPage />)
    expect(await screen.findByText('Today · 2 changes')).toBeInTheDocument()
  })

  it('groups earlier changes under their own day instead of Today', async () => {
    const today = new Date()
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 12)
    const twoDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2, 12)
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [
          { id: 'd1', type: 'WET', occurredAt: today.toISOString(), color: null, consistency: null },
          { id: 'd2', type: 'WET', occurredAt: yesterday.toISOString(), color: null, consistency: null },
          { id: 'd3', type: 'DIRTY', occurredAt: yesterday.toISOString(), color: null, consistency: null },
          { id: 'd4', type: 'WET', occurredAt: twoDaysAgo.toISOString(), color: null, consistency: null },
        ],
        error: null,
      },
    })
    renderWithProviders(<DiaperPage />)
    expect(await screen.findByText('Today · 1 change')).toBeInTheDocument()
    expect(screen.getAllByText('Today')).toHaveLength(2)
    expect(screen.getByText('Yesterday')).toBeInTheDocument()
    expect(
      screen.getByText(twoDaysAgo.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })),
    ).toBeInTheDocument()
    expect(screen.getByText('2 changes')).toBeInTheDocument()
  })

  it('requests a multi-day window so daily counts are not truncated', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    renderWithProviders(<DiaperPage />)
    await screen.findByText('Wet')
    expect(api.get).toHaveBeenCalledWith('/api/diaper', {
      params: { babyId: 'b1', since: expect.any(String) },
    })
  })

  it('reaches back to the start of an active sick episode older than a week', async () => {
    const now = new Date()
    const episodeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10, 15)
    activeEpisode.current = { startedAt: episodeStart.toISOString() }
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    renderWithProviders(<DiaperPage />)
    await screen.findByText('Wet')
    const since = new Date(episodeStart.getFullYear(), episodeStart.getMonth(), episodeStart.getDate())
    expect(api.get).toHaveBeenCalledWith('/api/diaper', {
      params: { babyId: 'b1', since: since.toISOString() },
    })
  })
})
