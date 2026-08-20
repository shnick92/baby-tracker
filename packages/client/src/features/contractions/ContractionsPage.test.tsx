import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@test/utils'
import { api } from '@lib/axios'
import { ContractionsPage } from './ContractionsPage'

vi.mock('@lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
vi.mock('@lib/socket', () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }))
vi.mock('@stores/authStore', () => ({
  useAuthStore: () => ({ babyId: 'b1', user: { name: 'Nick' } }),
}))

const emptyResponse = { data: { data: [], error: null } }

describe('ContractionsPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the Start Contraction button', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    renderWithProviders(<ContractionsPage />)
    expect(await screen.findByText('Start Contraction')).toBeInTheDocument()
  })

  it('calls POST /api/contractions/start when the button is tapped', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: 'c1', startedAt: new Date().toISOString(), endedAt: null, durationSec: null }, error: null },
    })
    renderWithProviders(<ContractionsPage />)
    await userEvent.click(await screen.findByText('Start Contraction'))
    expect(api.post).toHaveBeenCalledWith('/api/contractions/start', { babyId: 'b1' })
  })

  it('shows Stop and Cancel when an active contraction exists', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{ id: 'c1', startedAt: new Date(Date.now() - 30_000).toISOString(), endedAt: null, durationSec: null, createdAt: new Date().toISOString() }],
        error: null,
      },
    })
    renderWithProviders(<ContractionsPage />)
    expect(await screen.findByText('Stop')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('calls PATCH /:id/end when Stop is clicked', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{ id: 'c1', startedAt: new Date(Date.now() - 45_000).toISOString(), endedAt: null, durationSec: null, createdAt: new Date().toISOString() }],
        error: null,
      },
    })
    vi.mocked(api.patch).mockResolvedValue({
      data: { data: { id: 'c1', endedAt: new Date().toISOString(), durationSec: 45 }, error: null },
    })
    renderWithProviders(<ContractionsPage />)
    await userEvent.click(await screen.findByText('Stop'))
    expect(api.patch).toHaveBeenCalledWith('/api/contractions/c1/end', {})
  })

  it('shows recent contractions with duration and gap apart', async () => {
    const now = Date.now()
    const older = { id: 'c1', startedAt: new Date(now - 600_000).toISOString(), endedAt: new Date(now - 570_000).toISOString(), durationSec: 30, createdAt: new Date(now - 600_000).toISOString() }
    const newer = { id: 'c2', startedAt: new Date(now - 300_000).toISOString(), endedAt: new Date(now - 270_000).toISOString(), durationSec: 30, createdAt: new Date(now - 300_000).toISOString() }
    vi.mocked(api.get).mockResolvedValue({ data: { data: [newer, older], error: null } })
    renderWithProviders(<ContractionsPage />)
    expect(await screen.findByText('Recent contractions')).toBeInTheDocument()
    expect(screen.getByText(/5m apart/)).toBeInTheDocument()
  })

  it('calls DELETE /:id when a log is deleted', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{ id: 'c1', startedAt: new Date(Date.now() - 60_000).toISOString(), endedAt: new Date().toISOString(), durationSec: 30, createdAt: new Date().toISOString() }],
        error: null,
      },
    })
    vi.mocked(api.delete).mockResolvedValue({ data: { data: { id: 'c1' }, error: null } })
    renderWithProviders(<ContractionsPage />)
    const deleteBtn = await screen.findByLabelText('Delete')
    await userEvent.click(deleteBtn)
    expect(api.delete).toHaveBeenCalledWith('/api/contractions/c1')
  })
})
