import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@test/utils'
import { api } from '@lib/axios'
import { WeightPage } from './WeightPage'

vi.mock('@lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
vi.mock('@lib/socket', () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }))
vi.mock('@stores/authStore', () => ({
  useAuthStore: () => ({ babyId: 'b1', user: { name: 'Nick' }, birthDate: '2026-10-01T00:00:00.000Z' }),
}))
// Recharts uses ResizeObserver and SVG which aren't available in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ComposedChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

const emptyResponse = { data: { data: [], error: null } }

describe('WeightPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the + Log Weight button', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    renderWithProviders(<WeightPage />)
    expect(await screen.findByText('+ Log Weight')).toBeInTheDocument()
  })

  it('shows the weight form when + Log Weight is clicked', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    renderWithProviders(<WeightPage />)
    await userEvent.click(await screen.findByText('+ Log Weight'))
    expect(screen.getByText(/pounds/i)).toBeInTheDocument()
    expect(screen.getByText(/ounces/i)).toBeInTheDocument()
  })

  it('submits a weight log with lbs and oz', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: 'w1', lbs: 8, oz: 4, recordedAt: new Date().toISOString() }, error: null },
    })
    renderWithProviders(<WeightPage />)
    await userEvent.click(await screen.findByText('+ Log Weight'))

    const [lbsInput, ozInput] = screen.getAllByRole('spinbutton')
    await userEvent.clear(lbsInput!)
    await userEvent.type(lbsInput!, '8')
    await userEvent.clear(ozInput!)
    await userEvent.type(ozInput!, '4')
    await userEvent.click(screen.getByRole('button', { name: /log weight/i }))

    expect(api.post).toHaveBeenCalledWith(
      '/api/weight',
      expect.objectContaining({ babyId: 'b1', lbs: 8, oz: 4 }),
    )
  })

  it('shows validation error for negative pounds', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    renderWithProviders(<WeightPage />)
    await userEvent.click(await screen.findByText('+ Log Weight'))

    const [lbsInput] = screen.getAllByRole('spinbutton')
    await userEvent.clear(lbsInput!)
    await userEvent.type(lbsInput!, '-1')
    await userEvent.click(screen.getByRole('button', { name: /log weight/i }))

    expect(await screen.findByText('Min 0 lbs')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('displays existing weight logs', async () => {
    const date = new Date('2026-10-15').toISOString()
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [{ id: 'w1', lbs: 7, oz: 8, recordedAt: date, notes: 'Birth weight', createdAt: date }],
        error: null,
      },
    })
    renderWithProviders(<WeightPage />)
    const matches = await screen.findAllByText('7 lb 8 oz')
    expect(matches.length).toBeGreaterThan(0)
  })
})
