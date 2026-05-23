import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@test/utils'
import { api } from '@lib/axios'
import { MedicationPage } from './MedicationPage'

vi.mock('@lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
vi.mock('@lib/socket', () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }))
vi.mock('@stores/authStore', () => ({
  useAuthStore: () => ({ babyId: 'b1', user: { name: 'Nick' } }),
}))

const emptyResponse = { data: { data: [], error: null } }

describe('MedicationPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the Log Medication button', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    renderWithProviders(<MedicationPage />)
    expect(await screen.findByText('+ Log Medication')).toBeInTheDocument()
  })

  it('shows the log form when Log Medication is clicked', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    renderWithProviders(<MedicationPage />)
    await userEvent.click(await screen.findByText('+ Log Medication'))
    expect(screen.getByPlaceholderText(/vitamin d/i)).toBeInTheDocument()
  })

  it('submits a new log with name and dosage', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { id: 'm1', name: 'Tylenol', dosageNote: '5ml', givenAt: new Date().toISOString() }, error: null },
    })
    renderWithProviders(<MedicationPage />)
    await userEvent.click(await screen.findByText('+ Log Medication'))
    await userEvent.type(screen.getByPlaceholderText(/vitamin d/i), 'Tylenol')
    await userEvent.type(screen.getByPlaceholderText(/0\.5 ml/i), '5ml')
    await userEvent.click(screen.getByRole('button', { name: /^log medication$/i }))
    expect(api.post).toHaveBeenCalledWith(
      '/api/medication',
      expect.objectContaining({ babyId: 'b1', name: 'Tylenol', dosageNote: '5ml' }),
    )
  })

  it('shows validation error when name is empty on submit', async () => {
    vi.mocked(api.get).mockResolvedValue(emptyResponse)
    renderWithProviders(<MedicationPage />)
    await userEvent.click(await screen.findByText('+ Log Medication'))
    await userEvent.click(screen.getByRole('button', { name: /^log medication$/i }))
    expect(await screen.findByText('Medication name required')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('displays today\'s medications when logs exist', async () => {
    const now = new Date().toISOString()
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [
          { id: 'm1', name: 'Tylenol', dosageNote: '5ml', givenAt: now, notes: null, createdAt: now },
          { id: 'm2', name: 'Vitamin D', dosageNote: null, givenAt: now, notes: null, createdAt: now },
        ],
        error: null,
      },
    })
    renderWithProviders(<MedicationPage />)
    expect((await screen.findAllByText('Tylenol')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Vitamin D').length).toBeGreaterThan(0)
  })
})
