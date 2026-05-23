import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@test/utils'
import { api } from '@lib/axios'
import { MoodPage } from './MoodPage'

vi.mock('@lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
vi.mock('@lib/socket', () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }))
vi.mock('@stores/authStore', () => ({
  useAuthStore: () => ({ babyId: 'b1', user: { name: 'Nick' } }),
}))

const emptyResponse = { data: { data: [], error: null } }

// MoodPage fetches mood logs, custom activities, and the three feed sources
function mockAllEmpty() {
  vi.mocked(api.get).mockResolvedValue(emptyResponse)
}

describe('MoodPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders mood buttons and activity buttons', async () => {
    mockAllEmpty()
    renderWithProviders(<MoodPage />)
    expect(await screen.findByText('Happy')).toBeInTheDocument()
    expect(screen.getByText('Fussy')).toBeInTheDocument()
    expect(screen.getByText('Crying')).toBeInTheDocument()
    expect(screen.getByText('Alert')).toBeInTheDocument()
    expect(screen.getByText('Bath')).toBeInTheDocument()
    expect(screen.getByText('Walk')).toBeInTheDocument()
  })

  it('logs a mood immediately when a mood button is tapped', async () => {
    mockAllEmpty()
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: 'ml1', mood: 'HAPPY', qualifier: null, customActivityId: null, occurredAt: new Date().toISOString() }, error: null },
    })
    renderWithProviders(<MoodPage />)
    await userEvent.click(await screen.findByText('Happy'))
    expect(api.post).toHaveBeenCalledWith(
      '/api/mood',
      expect.objectContaining({ babyId: 'b1', mood: 'HAPPY' }),
    )
  })

  it('shows qualifier bottom sheet when Bath is tapped, not an immediate log', async () => {
    mockAllEmpty()
    renderWithProviders(<MoodPage />)
    await userEvent.click(await screen.findByText('Bath'))
    // Qualifier sheet should appear
    expect(screen.getByText('🛁 Bath logged')).toBeInTheDocument()
    expect(screen.getByText(/how was baby/i)).toBeInTheDocument()
    // No API call yet
    expect(api.post).not.toHaveBeenCalled()
  })

  it('logs Bath with qualifier when a mood is selected in the sheet', async () => {
    mockAllEmpty()
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: 'ml2', mood: 'BATH', qualifier: 'HAPPY', customActivityId: null, occurredAt: new Date().toISOString() }, error: null },
    })
    renderWithProviders(<MoodPage />)
    await userEvent.click(await screen.findByText('Bath'))
    await screen.findByText('🛁 Bath logged')
    // Click Happy in the qualifier sheet
    const happyButtons = screen.getAllByText('Happy')
    await userEvent.click(happyButtons[happyButtons.length - 1]!)
    expect(api.post).toHaveBeenCalledWith(
      '/api/mood',
      expect.objectContaining({ babyId: 'b1', mood: 'BATH', qualifier: 'HAPPY' }),
    )
  })

  it('logs Bath without qualifier when Skip is clicked', async () => {
    mockAllEmpty()
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: 'ml3', mood: 'BATH', qualifier: null, customActivityId: null, occurredAt: new Date().toISOString() }, error: null },
    })
    renderWithProviders(<MoodPage />)
    await userEvent.click(await screen.findByText('Bath'))
    await userEvent.click(await screen.findByText(/skip/i))
    expect(api.post).toHaveBeenCalledWith(
      '/api/mood',
      expect.objectContaining({ babyId: 'b1', mood: 'BATH' }),
    )
    expect((api.post as ReturnType<typeof vi.fn>).mock.calls[0][1]).not.toHaveProperty('qualifier')
  })

  it('shows the inline add form when the + button is clicked', async () => {
    mockAllEmpty()
    renderWithProviders(<MoodPage />)
    await userEvent.click(await screen.findByText('Add'))
    expect(screen.getByPlaceholderText('🎲')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
  })

  it('creates a custom activity when emoji and name are entered', async () => {
    mockAllEmpty()
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: 'ca1', name: 'Playtime', emoji: '🎲', sortOrder: 0 }, error: null },
    })
    renderWithProviders(<MoodPage />)
    await userEvent.click(await screen.findByText('Add'))
    fireEvent.change(screen.getByPlaceholderText('🎲'), { target: { value: '🎲' } })
    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Playtime' } })
    await userEvent.click(screen.getByText('✓'))
    expect(api.post).toHaveBeenCalledWith(
      '/api/mood/activities',
      expect.objectContaining({ babyId: 'b1', name: 'Playtime', emoji: '🎲' }),
    )
  })

  it('shows merged activity feed entries from other trackers', async () => {
    const now = new Date().toISOString()
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/api/mood?')) {
        return Promise.resolve({ data: { data: [], error: null } })
      }
      if (url.includes('/api/mood/activities')) {
        return Promise.resolve({ data: { data: [], error: null } })
      }
      if (url.includes('/api/feeding')) {
        return Promise.resolve({
          data: {
            data: [{ id: 'f1', type: 'BOTTLE', startedAt: now, endedAt: now, volumeOz: 3, durationSec: null }],
            error: null,
          },
        })
      }
      if (url.includes('/api/diaper')) {
        return Promise.resolve({
          data: {
            data: [{ id: 'd1', type: 'WET', occurredAt: now }],
            error: null,
          },
        })
      }
      return Promise.resolve({ data: { data: [], error: null } })
    })
    renderWithProviders(<MoodPage />)
    expect(await screen.findByText('Bottle')).toBeInTheDocument()
    expect(screen.getByText('Wet diaper')).toBeInTheDocument()
  })
})
