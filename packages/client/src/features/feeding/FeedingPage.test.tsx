import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@test/utils'
import { api } from '@lib/axios'
import { FeedingPage } from './FeedingPage'

vi.mock('@lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))
vi.mock('@lib/socket', () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }))
vi.mock('@stores/authStore', () => ({
  useAuthStore: () => ({ babyId: 'b1', user: { name: 'Nick' } }),
}))

const emptyResponse = { data: { data: [], error: null } }

describe('FeedingPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the four quick-log buttons', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    renderWithProviders(<FeedingPage />)
    expect(await screen.findByText('Left')).toBeInTheDocument()
    expect(screen.getByText('Right')).toBeInTheDocument()
    expect(screen.getByText('Bottle')).toBeInTheDocument()
    expect(screen.getByText('Pump')).toBeInTheDocument()
  })

  it('shows an active timer when a breast feed has no endedAt', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{ id: 'f1', type: 'BREAST_LEFT', startedAt: new Date(Date.now() - 90_000).toISOString(), endedAt: null, durationSec: null, volumeOz: null }],
        error: null,
      },
    })
    renderWithProviders(<FeedingPage />)
    expect(await screen.findByText('Stop')).toBeInTheDocument()
    expect(screen.getByText(/left breast/i)).toBeInTheDocument()
  })

  it('shows the bottle form when Bottle is tapped', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    renderWithProviders(<FeedingPage />)
    await screen.findByText('Bottle')
    await userEvent.click(screen.getByText('Bottle'))
    expect(screen.getByPlaceholderText('oz')).toBeInTheDocument()
  })

  it('calls POST /api/feeding/bottle on bottle submit', async () => {
    const user = userEvent.setup()
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'f2', type: 'BOTTLE' }, error: null } })
    renderWithProviders(<FeedingPage />)
    await screen.findByText('Bottle')
    await user.click(screen.getByText('Bottle'))
    const ozInput = await screen.findByPlaceholderText('oz')
    await user.type(ozInput, '3')
    await user.click(screen.getByRole('button', { name: 'Log bottle' }))
    expect(api.post).toHaveBeenCalledWith('/api/feeding/bottle', { babyId: 'b1', volumeOz: 3 })
  })
})
