import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@test/utils'
import { api } from '@lib/axios'
import { SleepPage } from './SleepPage'

vi.mock('@lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))
vi.mock('@lib/socket', () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }))
vi.mock('@stores/authStore', () => ({
  useAuthStore: () => ({ babyId: 'b1', user: { name: 'Nick' } }),
}))

const emptyResponse = { data: { data: [], error: null } }

describe('SleepPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders Nap and Night sleep buttons', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    renderWithProviders(<SleepPage />)
    expect(await screen.findByText('Nap')).toBeInTheDocument()
    expect(screen.getByText('Night sleep')).toBeInTheDocument()
  })

  it('shows an active timer and Wake button when a sleep session has no endedAt', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{ id: 's1', type: 'NAP', startedAt: new Date(Date.now() - 300_000).toISOString(), endedAt: null }],
        error: null,
      },
    })
    renderWithProviders(<SleepPage />)
    expect(await screen.findByText('Wake up')).toBeInTheDocument()
    expect(screen.getByText('Napping')).toBeInTheDocument()
  })

  it('calls POST /api/sleep/start when Nap is tapped', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 's2', type: 'NAP' }, error: null } })
    renderWithProviders(<SleepPage />)
    await screen.findByText('Nap')
    await userEvent.click(screen.getByText('Nap'))
    expect(api.post).toHaveBeenCalledWith('/api/sleep/start', { babyId: 'b1', type: 'NAP' })
  })
})
