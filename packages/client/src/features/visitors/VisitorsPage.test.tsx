import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VisitorsPage } from './VisitorsPage'
import { api } from '@lib/axios'
import { renderWithProviders } from '@test/utils'

vi.mock('@lib/axios')
vi.mock('@lib/socket')
vi.mock('@stores/authStore')

const NO_TIME_SLOT = { id: '1', name: 'Alice', date: '2026-10-15', startTime: null, endTime: null, notes: null }
const TIMED_SLOT = {
  id: '2',
  name: 'Bob',
  date: '2026-10-16',
  startTime: '2026-10-16T14:00:00.000Z',
  endTime: '2026-10-16T16:00:00.000Z',
  notes: null,
}
const NOTED_SLOT = {
  id: '3',
  name: 'Carol',
  date: '2026-11-01',
  startTime: null,
  endTime: null,
  notes: 'Bringing food',
}

describe('VisitorsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows a loading spinner while fetching', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    const { container } = renderWithProviders(<VisitorsPage />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows empty state when no visits are scheduled', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } })
    renderWithProviders(<VisitorsPage />)
    expect(await screen.findByText('No visits scheduled yet')).toBeInTheDocument()
  })

  it('renders visitor names after loading', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [NO_TIME_SLOT, TIMED_SLOT] } })
    renderWithProviders(<VisitorsPage />)
    expect(await screen.findByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('groups visits under month/year section headers', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [NO_TIME_SLOT, NOTED_SLOT] } })
    renderWithProviders(<VisitorsPage />)
    await screen.findByText('Alice')
    expect(screen.getByText('October 2026')).toBeInTheDocument()
    expect(screen.getByText('November 2026')).toBeInTheDocument()
  })

  it('shows the day number in each date box', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [NO_TIME_SLOT] } })
    renderWithProviders(<VisitorsPage />)
    await screen.findByText('Alice')
    expect(screen.getByText('15')).toBeInTheDocument()
  })

  it('omits the time row when startTime is null', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [NO_TIME_SLOT] } })
    renderWithProviders(<VisitorsPage />)
    await screen.findByText('Alice')
    // no time text rendered
    const card = screen.getByText('Alice').closest('div')
    expect(card?.textContent).not.toMatch(/AM|PM/)
  })

  it('shows the time range when startTime is set', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [TIMED_SLOT] } })
    renderWithProviders(<VisitorsPage />)
    await screen.findByText('Bob')
    const card = screen.getByText('Bob').closest('.flex-1')
    expect(card?.textContent).toMatch(/AM|PM/)
  })

  it('shows notes when present', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [NOTED_SLOT] } })
    renderWithProviders(<VisitorsPage />)
    await screen.findByText('Carol')
    expect(screen.getByText('Bringing food')).toBeInTheDocument()
  })

  it('end-time input is disabled when start-time is empty', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } })
    const { container } = renderWithProviders(<VisitorsPage />)
    await userEvent.click(await screen.findByText('+ Schedule a visit'))
    expect(container.querySelector('input[data-testid="end-time"]')).toBeDisabled()
  })

  it('end-time input is enabled and gets min set after start-time is entered', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } })
    const { container } = renderWithProviders(<VisitorsPage />)
    await userEvent.click(await screen.findByText('+ Schedule a visit'))

    fireEvent.change(container.querySelector('input[data-testid="start-time"]')!, { target: { value: '10:00' } })

    const endTime = container.querySelector('input[data-testid="end-time"]') as HTMLInputElement
    expect(endTime).not.toBeDisabled()
    expect(endTime.min).toBe('10:00')
  })

  it('changing start-time to after end-time clears end-time', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } })
    const { container } = renderWithProviders(<VisitorsPage />)
    await userEvent.click(await screen.findByText('+ Schedule a visit'))

    const startTime = container.querySelector('input[data-testid="start-time"]')!
    const endTime = container.querySelector('input[data-testid="end-time"]') as HTMLInputElement

    fireEvent.change(startTime, { target: { value: '10:00' } })
    fireEvent.change(endTime, { target: { value: '11:00' } })
    expect(endTime.value).toBe('11:00')

    fireEvent.change(startTime, { target: { value: '12:00' } })
    expect(endTime.value).toBe('')
  })

  it('add button is disabled without name or date', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } })
    renderWithProviders(<VisitorsPage />)
    await userEvent.click(await screen.findByText('+ Schedule a visit'))
    expect(screen.getByRole('button', { name: 'Add visit' })).toBeDisabled()
  })

  it('add button is enabled with just name and date — times are not required', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } })
    const { container } = renderWithProviders(<VisitorsPage />)
    await userEvent.click(await screen.findByText('+ Schedule a visit'))

    await userEvent.type(screen.getByPlaceholderText('Visitor name *'), 'Test Person')
    fireEvent.change(container.querySelector('input[data-testid="visit-date"]')!, { target: { value: '2026-10-15' } })

    expect(screen.getByRole('button', { name: 'Add visit' })).not.toBeDisabled()
  })

  it('submitting without times sends undefined startTime and endTime', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } })
    vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'new' } } })
    const { container } = renderWithProviders(<VisitorsPage />)
    await userEvent.click(await screen.findByText('+ Schedule a visit'))

    await userEvent.type(screen.getByPlaceholderText('Visitor name *'), 'Test Person')
    fireEvent.change(container.querySelector('input[data-testid="visit-date"]')!, { target: { value: '2026-10-15' } })
    await userEvent.click(screen.getByRole('button', { name: 'Add visit' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/api/visitors',
        expect.objectContaining({ name: 'Test Person', date: '2026-10-15', startTime: undefined, endTime: undefined }),
        expect.anything(),
      )
    })
  })

  it('delete button calls delete API for that slot', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [NO_TIME_SLOT] } })
    vi.mocked(api.delete).mockResolvedValue({ data: { data: { success: true } } })
    renderWithProviders(<VisitorsPage />)
    await screen.findByText('Alice')

    await userEvent.click(screen.getByRole('button', { name: 'Delete Alice' }))

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/visitors/1')
    })
  })
})
