import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@test/utils'
import { api } from '@lib/axios'
import { IllnessBanner } from './IllnessBanner'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

const mockGet = vi.mocked(api.get)

const ACTIVE_EPISODE = {
  id: 'ep-1',
  babyId: 'b1',
  startedById: 'u1',
  startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  endedAt: null,
  notes: null,
  symptoms: [{ id: 's1', episodeId: 'ep-1', label: 'Fever', onsetAt: null, resolvedAt: null, createdAt: new Date().toISOString() }],
  temperatureLogs: [],
  createdAt: new Date().toISOString(),
}

describe('IllnessBanner', () => {
  it('renders nothing when no active episode', async () => {
    mockGet.mockResolvedValue({ data: { data: null, error: null } })
    const { container } = renderWithProviders(<IllnessBanner />)
    // Wait for query, then expect nothing rendered
    await new Promise((r) => setTimeout(r, 50))
    expect(container.firstChild).toBeNull()
  })

  it('shows episode info and symptom chip when episode is active', async () => {
    mockGet.mockResolvedValue({ data: { data: ACTIVE_EPISODE, error: null } })
    renderWithProviders(<IllnessBanner />)
    expect(await screen.findByText(/Baby is sick/)).toBeInTheDocument()
    expect(await screen.findByText('Fever')).toBeInTheDocument()
  })

  it('shows the Feel Better button', async () => {
    mockGet.mockResolvedValue({ data: { data: ACTIVE_EPISODE, error: null } })
    renderWithProviders(<IllnessBanner />)
    expect(await screen.findByText(/Feel Better/)).toBeInTheDocument()
  })

  it('opens the FeelBetter sheet when Feel Better is tapped', async () => {
    mockGet.mockResolvedValue({ data: { data: ACTIVE_EPISODE, error: null } })
    renderWithProviders(<IllnessBanner />)
    const btn = await screen.findByText(/Feel Better/)
    await userEvent.click(btn)
    expect(screen.getByText(/Is baby feeling better\?/i)).toBeInTheDocument()
  })
})
