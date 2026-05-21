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

const emptyResponse = { data: { data: [], error: null } }

describe('DiaperPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the three type buttons', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    renderWithProviders(<DiaperPage />)
    expect(await screen.findByText('Wet')).toBeInTheDocument()
    expect(screen.getByText('Dirty')).toBeInTheDocument()
    expect(screen.getByText('Wet + Dirty')).toBeInTheDocument()
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
    expect(screen.getByText('Log diaper')).toBeInTheDocument()
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
    expect(await screen.findByText('2 diapers today')).toBeInTheDocument()
    expect(screen.getByText('1 wet · 1 dirty')).toBeInTheDocument()
  })
})
