import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PurchasesPage } from './PurchasesPage'
import { api } from '@lib/axios'
import { renderWithProviders } from '@test/utils'

vi.mock('@lib/axios')
vi.mock('@lib/socket')
vi.mock('@stores/authStore')

const mockResponse = {
  data: [
    { id: 'p1', name: 'Crib', category: 'Nursery', status: 'NEEDED', price: 299.99, notes: null, url: null },
    { id: 'p2', name: 'Breast pump', category: 'Feeding', status: 'BOUGHT', price: 149.99, notes: null, url: null },
    { id: 'p3', name: 'Bottles', category: 'Feeding', status: 'GIFTED', price: null, notes: null, url: null },
    { id: 'p4', name: 'Wipe warmer', category: 'Nursery', status: 'SKIP', price: null, notes: null, url: null },
  ],
  meta: { total: 4, bought: 2 },
}

describe('PurchasesPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows a loading spinner while fetching', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    const { container } = renderWithProviders(<PurchasesPage />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders purchase names with their status badges', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })
    renderWithProviders(<PurchasesPage />)
    expect(await screen.findByText('Crib')).toBeInTheDocument()
    expect(screen.getByText('Need')).toBeInTheDocument()
    expect(screen.getByText('Breast pump')).toBeInTheDocument()
    expect(screen.getByText('Bought')).toBeInTheDocument()
    expect(screen.getByText('Bottles')).toBeInTheDocument()
    expect(screen.getByText('Gifted')).toBeInTheDocument()
  })

  it('shows bought/total acquired count in the header', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })
    renderWithProviders(<PurchasesPage />)
    expect(await screen.findByText('2/4 acquired')).toBeInTheDocument()
  })

  it('renders BOUGHT and GIFTED items with strikethrough text', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })
    renderWithProviders(<PurchasesPage />)
    await screen.findByText('Breast pump')
    expect(screen.getByText('Breast pump')).toHaveClass('line-through')
    expect(screen.getByText('Bottles')).toHaveClass('line-through')
    expect(screen.getByText('Crib')).not.toHaveClass('line-through')
  })

  it('renders SKIP items with reduced opacity', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })
    renderWithProviders(<PurchasesPage />)
    await screen.findByText('Wipe warmer')
    const row = screen.getByText('Wipe warmer').closest('.flex')
    expect(row).toHaveClass('opacity-40')
  })

  it('clicking a status badge calls patch with the next status in the cycle', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })
    vi.mocked(api.patch).mockResolvedValue({ data: { data: {} } })
    renderWithProviders(<PurchasesPage />)

    await userEvent.click(await screen.findByText('Need'))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/api/purchases/p1', { status: 'BOUGHT' })
    })
  })

  it('status cycle order: NEEDED → BOUGHT → GIFTED → SKIP → NEEDED', async () => {
    const transitions: [string, string, string][] = [
      ['NEEDED', 'Need', 'BOUGHT'],
      ['BOUGHT', 'Bought', 'GIFTED'],
      ['GIFTED', 'Gifted', 'SKIP'],
      ['SKIP', 'Skip', 'NEEDED'],
    ]

    for (const [currentStatus, badgeLabel, nextStatus] of transitions) {
      vi.clearAllMocks()
      vi.mocked(api.get).mockResolvedValue({
        data: {
          data: [{ id: 'px', name: 'Item', category: 'Test', status: currentStatus, price: null, notes: null, url: null }],
          meta: { total: 1, bought: 0 },
        },
      })
      vi.mocked(api.patch).mockResolvedValue({ data: { data: {} } })

      const { unmount } = renderWithProviders(<PurchasesPage />)
      await userEvent.click(await screen.findByText(badgeLabel))
      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/api/purchases/px', { status: nextStatus })
      })
      unmount()
    }
  })

  it('add item button is disabled until name is entered', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })
    renderWithProviders(<PurchasesPage />)
    await screen.findByText('Crib')

    await userEvent.click(screen.getByText('+ Add item'))
    expect(screen.getByRole('button', { name: 'Add item' })).toBeDisabled()

    await userEvent.type(screen.getByPlaceholderText('Item name *'), 'New item')
    expect(screen.getByRole('button', { name: 'Add item' })).not.toBeDisabled()
  })
})
