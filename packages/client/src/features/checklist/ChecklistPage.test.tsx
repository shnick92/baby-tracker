import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChecklistPage } from './ChecklistPage'
import { api } from '@lib/axios'
import { renderWithRoute } from '@test/utils'

vi.mock('@lib/axios')
vi.mock('@lib/socket')
vi.mock('@stores/authStore')

function renderPage(type = 'hospital_bag_mom') {
  return renderWithRoute(<ChecklistPage />, {
    route: `/checklist/${type}`,
    path: '/checklist/:type',
  })
}

const mockChecklist = {
  id: 'cl1',
  type: 'HOSPITAL_BAG_MOM',
  items: [
    { id: 'i1', label: 'Comfy clothes', category: 'Clothing', notes: null, isChecked: false, checkedAt: null, sortOrder: 0 },
    { id: 'i2', label: 'Snacks', category: 'Food', notes: null, isChecked: true, checkedAt: '2026-10-15T10:00:00.000Z', sortOrder: 1 },
    { id: 'i3', label: 'Phone charger', category: 'Electronics', notes: null, isChecked: false, checkedAt: null, sortOrder: 2 },
  ],
}

describe('ChecklistPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows a loading skeleton while fetching', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    const { container } = renderPage()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders item labels after loading', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockChecklist } })
    renderPage()
    expect(await screen.findByText('Comfy clothes')).toBeInTheDocument()
    expect(screen.getByText('Snacks')).toBeInTheDocument()
    expect(screen.getByText('Phone charger')).toBeInTheDocument()
  })

  it('groups items under their category headings', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockChecklist } })
    renderPage()
    await screen.findByText('Comfy clothes')
    expect(screen.getByText('Clothing')).toBeInTheDocument()
    expect(screen.getByText('Food')).toBeInTheDocument()
    expect(screen.getByText('Electronics')).toBeInTheDocument()
  })

  it('shows correct checked/total count in the header', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockChecklist } })
    renderPage()
    await screen.findByText('Comfy clothes')
    // count appears in both the header and the progress card
    expect(screen.getAllByText('1/3').length).toBeGreaterThan(0)
  })

  it('renders checked items with strikethrough text', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockChecklist } })
    renderPage()
    expect(await screen.findByText('Snacks')).toHaveClass('line-through')
    expect(screen.getByText('Comfy clothes')).not.toHaveClass('line-through')
  })

  it('renders all four tab links', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockChecklist } })
    renderPage()
    await screen.findByText('Comfy clothes')
    expect(screen.getByText("Mom's Bag")).toBeInTheDocument()
    expect(screen.getByText("Baby's Bag")).toBeInTheDocument()
    expect(screen.getByText('Home Prep')).toBeInTheDocument()
    expect(screen.getByText('Before Home')).toBeInTheDocument()
  })

  it('add item button is disabled until label is entered', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockChecklist } })
    renderPage()
    await screen.findByText('Comfy clothes')

    await userEvent.click(screen.getByText('+ Add custom item'))
    expect(screen.getByRole('button', { name: 'Add item' })).toBeDisabled()

    await userEvent.type(screen.getByPlaceholderText('Item name'), 'My custom item')
    expect(screen.getByRole('button', { name: 'Add item' })).not.toBeDisabled()
  })

  // --- edit ---

  it('edit button opens an inline form pre-populated with the item label and category', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockChecklist } })
    renderPage()
    await screen.findByText('Comfy clothes')

    await userEvent.click(screen.getByRole('button', { name: 'Edit Comfy clothes' }))
    expect(screen.getByPlaceholderText('Item name')).toHaveValue('Comfy clothes')
    expect(screen.getByPlaceholderText('Category')).toHaveValue('Clothing')
    // the row itself is replaced by the form
    expect(screen.queryByText('Comfy clothes')).not.toBeInTheDocument()
  })

  it('cancel closes the edit form without calling patch', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockChecklist } })
    renderPage()
    await screen.findByText('Comfy clothes')

    await userEvent.click(screen.getByRole('button', { name: 'Edit Comfy clothes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText('Comfy clothes')).toBeInTheDocument()
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('saving the edit form patches the item with the new label and category', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockChecklist } })
    vi.mocked(api.patch).mockResolvedValue({ data: { data: null } })
    renderPage()
    await screen.findByText('Comfy clothes')

    await userEvent.click(screen.getByRole('button', { name: 'Edit Comfy clothes' }))
    const labelInput = screen.getByPlaceholderText('Item name')
    await userEvent.clear(labelInput)
    await userEvent.type(labelInput, 'Comfy going-home outfit')
    const categoryInput = screen.getByPlaceholderText('Category')
    await userEvent.clear(categoryInput)
    await userEvent.type(categoryInput, 'Going home')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(api.patch).toHaveBeenCalledWith('/api/checklist/items/i1', {
      label: 'Comfy going-home outfit',
      category: 'Going home',
    })
    expect(screen.queryByPlaceholderText('Item name')).not.toBeInTheDocument()
  })

  it('clearing the label shows an inline error and does not save', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockChecklist } })
    renderPage()
    await screen.findByText('Comfy clothes')

    await userEvent.click(screen.getByRole('button', { name: 'Edit Comfy clothes' }))
    await userEvent.clear(screen.getByPlaceholderText('Item name'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Required')).toBeInTheDocument()
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('editing a checked item keeps its checked state (no toggle call)', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: mockChecklist } })
    vi.mocked(api.patch).mockResolvedValue({ data: { data: null } })
    renderPage()
    await screen.findByText('Snacks')

    await userEvent.click(screen.getByRole('button', { name: 'Edit Snacks' }))
    await userEvent.type(screen.getByPlaceholderText('Item name'), ' and drinks')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(api.patch).toHaveBeenCalledTimes(1)
    expect(api.patch).toHaveBeenCalledWith('/api/checklist/items/i2', {
      label: 'Snacks and drinks',
      category: 'Food',
    })
  })

  // --- delete ---

  it('delete button calls delete and the item disappears from the list', async () => {
    const withoutCharger = { ...mockChecklist, items: mockChecklist.items.filter((i) => i.id !== 'i3') }
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { data: mockChecklist } })
      .mockResolvedValue({ data: { data: withoutCharger } })
    vi.mocked(api.delete).mockResolvedValue({ data: { data: { success: true } } })
    renderPage()
    await screen.findByText('Phone charger')

    await userEvent.click(screen.getByRole('button', { name: 'Delete Phone charger' }))

    expect(api.delete).toHaveBeenCalledWith('/api/checklist/items/i3')
    await waitFor(() => expect(screen.queryByText('Phone charger')).not.toBeInTheDocument())
    expect(screen.getByText('Comfy clothes')).toBeInTheDocument()
  })
})
