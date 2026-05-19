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
    { id: 'p1', name: 'Crib', category: 'Nursery', status: 'NEEDED', price: 299.99, notes: null, url: 'https://example.com/crib', shortCode: 'abc123' },
    { id: 'p2', name: 'Breast pump', category: 'Feeding', status: 'BOUGHT', price: 149.99, notes: null, url: null, shortCode: null },
    { id: 'p3', name: 'Bottles', category: 'Feeding', status: 'GIFTED', price: null, notes: null, url: null, shortCode: null },
    { id: 'p4', name: 'Wipe warmer', category: 'Nursery', status: 'SKIP', price: null, notes: null, url: null, shortCode: null },
  ],
  meta: { total: 4, bought: 2 },
}

describe('PurchasesPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows a skeleton while fetching', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    const { container } = renderWithProviders(<PurchasesPage />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
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
    expect(await screen.findByText('2 of 4 acquired')).toBeInTheDocument()
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
          data: [{ id: 'px', name: 'Item', category: 'Test', status: currentStatus, price: null, notes: null, url: null, shortCode: null }],
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

  // --- edit ---

  it('edit button opens an inline form pre-populated with the purchase values', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })
    renderWithProviders(<PurchasesPage />)
    await screen.findByText('Crib')

    await userEvent.click(screen.getByRole('button', { name: 'Edit Crib' }))

    expect(screen.getByDisplayValue('Crib')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Nursery')).toBeInTheDocument()
    expect(screen.getByDisplayValue('299.99')).toBeInTheDocument()
  })

  it('cancel button closes the edit form without calling patch', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })
    renderWithProviders(<PurchasesPage />)
    await screen.findByText('Crib')

    await userEvent.click(screen.getByRole('button', { name: 'Edit Crib' }))
    expect(screen.getByDisplayValue('Crib')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText('Crib')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Crib')).not.toBeInTheDocument()
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('submitting the edit form calls patch with updated values', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })
    vi.mocked(api.patch).mockResolvedValue({ data: { data: {} } })
    renderWithProviders(<PurchasesPage />)
    await screen.findByText('Crib')

    await userEvent.click(screen.getByRole('button', { name: 'Edit Crib' }))

    const nameInput = screen.getByDisplayValue('Crib')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Bassinet')

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/api/purchases/p1',
        expect.objectContaining({ name: 'Bassinet', category: 'Nursery' }),
      )
    })
  })

  it('edit form includes a notes field not present in the add form', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })
    renderWithProviders(<PurchasesPage />)
    await screen.findByText('Crib')

    // No notes field before editing
    expect(screen.queryByPlaceholderText('Notes (optional)')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Crib' }))

    expect(screen.getByPlaceholderText('Notes (optional)')).toBeInTheDocument()
  })

  // --- visit button ---

  it('shows a Visit link for purchases that have a shortCode', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })
    renderWithProviders(<PurchasesPage />)

    // p1 has shortCode 'abc123'
    const visitLink = await screen.findByRole('link', { name: 'Visit link for Crib' })
    expect(visitLink).toHaveAttribute('href', '/s/abc123')
    expect(visitLink).toHaveAttribute('target', '_blank')
  })

  it('does not show a Visit link for purchases without a shortCode', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })
    renderWithProviders(<PurchasesPage />)

    await screen.findByText('Breast pump')
    // p2 has no shortCode
    expect(screen.queryByRole('link', { name: 'Visit link for Breast pump' })).not.toBeInTheDocument()
  })

  it('price inputs have step="any" to allow decimal values', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })
    const { container } = renderWithProviders(<PurchasesPage />)
    await screen.findByText('Crib')

    // Add form price input
    await userEvent.click(screen.getByText('+ Add item'))
    const addPrice = container.querySelector('input[placeholder="Price (optional)"]')
    expect(addPrice).toHaveAttribute('step', 'any')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    // Edit form price input
    await userEvent.click(screen.getByRole('button', { name: 'Edit Crib' }))
    const editPrice = container.querySelector('input[placeholder="Price"]')
    expect(editPrice).toHaveAttribute('step', 'any')
  })
})
