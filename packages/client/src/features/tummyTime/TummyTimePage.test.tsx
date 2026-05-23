import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@test/utils'
import { api } from '@lib/axios'
import { TummyTimePage } from './TummyTimePage'

vi.mock('@lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
vi.mock('@lib/socket', () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }))
vi.mock('@stores/authStore', () => ({
  useAuthStore: () => ({ babyId: 'b1', user: { name: 'Nick' } }),
}))

const emptyResponse = { data: { data: [], error: null } }

describe('TummyTimePage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the Start Tummy Time button', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    renderWithProviders(<TummyTimePage />)
    expect(await screen.findByText('Start Tummy Time')).toBeInTheDocument()
  })

  it('calls POST /api/tummy-time/start when the button is tapped', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: 't1', startedAt: new Date().toISOString(), endedAt: null, durationSec: null }, error: null },
    })
    renderWithProviders(<TummyTimePage />)
    await userEvent.click(await screen.findByText('Start Tummy Time'))
    expect(api.post).toHaveBeenCalledWith('/api/tummy-time/start', { babyId: 'b1' })
  })

  it('shows Stop and Cancel when an active session exists', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{ id: 't1', startedAt: new Date(Date.now() - 120_000).toISOString(), endedAt: null, durationSec: null, notes: null, createdAt: new Date().toISOString() }],
        error: null,
      },
    })
    renderWithProviders(<TummyTimePage />)
    expect(await screen.findByText('Stop')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Tummy time active')).toBeInTheDocument()
  })

  it('calls PATCH /:id/end when Stop is clicked', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{ id: 't1', startedAt: new Date(Date.now() - 60_000).toISOString(), endedAt: null, durationSec: null, notes: null, createdAt: new Date().toISOString() }],
        error: null,
      },
    })
    vi.mocked(api.patch).mockResolvedValue({
      data: { data: { id: 't1', endedAt: new Date().toISOString(), durationSec: 60 }, error: null },
    })
    renderWithProviders(<TummyTimePage />)
    await userEvent.click(await screen.findByText('Stop'))
    expect(api.patch).toHaveBeenCalledWith('/api/tummy-time/t1/end', {})
  })

  it('shows today\'s total when completed sessions exist', async () => {
    const now = new Date().toISOString()
    const start = new Date(Date.now() - 300_000).toISOString()
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{ id: 't1', startedAt: start, endedAt: now, durationSec: 300, notes: null, createdAt: now }],
        error: null,
      },
    })
    renderWithProviders(<TummyTimePage />)
    expect(await screen.findByText('Total today')).toBeInTheDocument()
  })
})
