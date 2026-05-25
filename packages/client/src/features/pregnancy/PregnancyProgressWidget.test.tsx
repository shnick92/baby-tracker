import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'

import { PregnancyProgressWidget } from './PregnancyProgressWidget'
import { api } from '@lib/axios'
import { renderWithProviders } from '@test/utils'

vi.mock('@lib/axios')
vi.mock('@lib/socket')
vi.mock('@stores/authStore')

const mockStatus = {
  weeksPregnant: 20,
  weeksRemaining: 20,
  progressPct: 50,
  babySize: 'banana',
  dueDate: '2026-06-09T00:00:00.000Z',
  born: false,
}

describe('PregnancyProgressWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows skeleton while loading', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    const { container } = renderWithProviders(<PregnancyProgressWidget />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders week number and heading after load', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockStatus } })
    renderWithProviders(<PregnancyProgressWidget />)
    expect(await screen.findByText(/Week 20 of 40/)).toBeInTheDocument()
  })

  it('renders the baby size', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockStatus } })
    renderWithProviders(<PregnancyProgressWidget />)
    await screen.findByText(/Week 20 of 40/)
    expect(screen.getByText(/banana/)).toBeInTheDocument()
  })

  it('renders weeks remaining text', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockStatus } })
    renderWithProviders(<PregnancyProgressWidget />)
    await screen.findByText(/Week 20 of 40/)
    expect(screen.getByText(/20 weeks to go/)).toBeInTheDocument()
  })

  it('renders nothing when born is true', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { ...mockStatus, born: true } } })
    const { container } = renderWithProviders(<PregnancyProgressWidget />)
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('renders nothing when data is null (no dueDate set)', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: null } })
    const { container } = renderWithProviders(<PregnancyProgressWidget />)
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('renders the SVG progress ring with aria-label', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockStatus } })
    renderWithProviders(<PregnancyProgressWidget />)
    const svg = await screen.findByRole('img', { name: /20 weeks pregnant/i })
    expect(svg).toBeInTheDocument()
  })
})
