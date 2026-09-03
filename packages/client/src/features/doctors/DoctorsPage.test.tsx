import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DoctorsPage } from './DoctorsPage'
import { api } from '@lib/axios'
import { renderWithProviders } from '@test/utils'

vi.mock('@lib/axios')
vi.mock('@lib/socket')
vi.mock('@stores/authStore')

const RIVERA = {
  id: 'd1', name: 'Dr. Rivera', specialty: 'Pediatrician', practiceName: 'Springfield Pediatrics',
  address: '12 Main St', phone: '555-0100', notes: null, isChosen: false, addedById: 'u1', _count: { appointments: 1 },
}
const CHEN = {
  id: 'd2', name: 'Dr. Chen', specialty: null, practiceName: null,
  address: null, phone: null, notes: 'Recommended by a friend', isChosen: true, addedById: 'u1', _count: { appointments: 0 },
}
const FUTURE_APPT = {
  id: 'a1', doctorId: 'd1', title: 'Meet & greet', date: '2099-03-10',
  startTime: '2099-03-10T15:00:00.000Z', endTime: null, notes: null,
  doctor: { id: 'd1', name: 'Dr. Rivera', practiceName: 'Springfield Pediatrics', address: '12 Main St' },
}
const PAST_APPT = {
  id: 'a0', doctorId: 'd1', title: null, date: '2020-01-05',
  startTime: null, endTime: null, notes: null,
  doctor: { id: 'd1', name: 'Dr. Rivera', practiceName: null, address: null },
}

function mockLists(doctors: unknown[], appointments: unknown[]) {
  vi.mocked(api.get).mockImplementation((url: string) =>
    Promise.resolve({ data: { data: url.endsWith('/appointments') ? appointments : doctors } }),
  )
}

describe('DoctorsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('shows a skeleton while fetching', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}))
    const { container } = renderWithProviders(<DoctorsPage />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows empty states and disables scheduling when there are no doctors', async () => {
    mockLists([], [])
    renderWithProviders(<DoctorsPage />)
    expect(await screen.findByText(/No doctors added yet/)).toBeInTheDocument()
    expect(screen.getByText('Add a doctor below to schedule an appointment')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Schedule an appointment' })).toBeDisabled()
  })

  it('renders doctors with their location, phone and chosen badge', async () => {
    mockLists([RIVERA, CHEN], [])
    renderWithProviders(<DoctorsPage />)
    expect(await screen.findByText('Dr. Rivera')).toBeInTheDocument()
    expect(screen.getByText('Springfield Pediatrics · 12 Main St')).toBeInTheDocument()
    expect(screen.getByText('555-0100')).toBeInTheDocument()
    expect(screen.getByText('Our doctor')).toBeInTheDocument()
    expect(screen.getByText('Recommended by a friend')).toBeInTheDocument()
  })

  it('shows the chosen doctor in the header subtitle', async () => {
    mockLists([RIVERA, CHEN], [])
    renderWithProviders(<DoctorsPage />)
    expect(await screen.findByText('Our doctor · Dr. Chen')).toBeInTheDocument()
  })

  it('marks a doctor as chosen via the star button', async () => {
    mockLists([RIVERA], [])
    vi.mocked(api.post).mockResolvedValue({ data: { data: {} } })
    renderWithProviders(<DoctorsPage />)
    await screen.findByText('Dr. Rivera')

    await userEvent.click(screen.getByRole('button', { name: 'Mark Dr. Rivera as our doctor' }))

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/doctors/d1/choose'))
  })

  it('lists upcoming appointments and hides past ones behind a toggle', async () => {
    mockLists([RIVERA], [FUTURE_APPT, PAST_APPT])
    renderWithProviders(<DoctorsPage />)
    expect(await screen.findByText('Meet & greet')).toBeInTheDocument()
    expect(screen.queryByText('Appointment')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Show past (1)' }))
    expect(screen.getByText('Appointment')).toBeInTheDocument()
  })

  it('adds a doctor through the form', async () => {
    mockLists([], [])
    vi.mocked(api.post).mockResolvedValue({ data: { data: {} } })
    renderWithProviders(<DoctorsPage />)
    await screen.findByText(/No doctors added yet/)

    await userEvent.click(screen.getByRole('button', { name: '+ Add a doctor' }))
    await userEvent.type(screen.getByPlaceholderText('Doctor name *'), 'Dr. Okafor')
    await userEvent.type(screen.getByPlaceholderText('Address'), '9 Elm Ave')
    await userEvent.click(screen.getByRole('button', { name: 'Add doctor' }))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/api/doctors',
        expect.objectContaining({ name: 'Dr. Okafor', address: '9 Elm Ave' }),
        { params: { babyId: 'test-baby' } },
      ),
    )
  })

  it('shows a validation error when the doctor name is empty', async () => {
    mockLists([], [])
    renderWithProviders(<DoctorsPage />)
    await screen.findByText(/No doctors added yet/)

    await userEvent.click(screen.getByRole('button', { name: '+ Add a doctor' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add doctor' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('schedules an appointment from a doctor card with the doctor preselected', async () => {
    mockLists([RIVERA, CHEN], [])
    vi.mocked(api.post).mockResolvedValue({ data: { data: {} } })
    renderWithProviders(<DoctorsPage />)
    await screen.findByText('Dr. Rivera')

    const cardButtons = screen.getAllByRole('button', { name: 'Add appointment' })
    await userEvent.click(cardButtons[0])

    const select = screen.getByRole('combobox', { name: 'Doctor' })
    expect(select).toHaveValue('d1')

    await userEvent.type(screen.getByPlaceholderText(/What for/), 'Meet & greet')
    await userEvent.type(screen.getByLabelText('Date'), '2099-03-10')
    await userEvent.click(screen.getByRole('button', { name: 'Save appointment' }))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/api/doctors/d1/appointments',
        expect.objectContaining({ title: 'Meet & greet', date: '2099-03-10' }),
      ),
    )
  })

  it('requires a doctor when scheduling from the top-level button', async () => {
    mockLists([RIVERA], [])
    renderWithProviders(<DoctorsPage />)
    await screen.findByText('Dr. Rivera')

    await userEvent.click(screen.getByRole('button', { name: '+ Schedule an appointment' }))
    await userEvent.type(screen.getByLabelText('Date'), '2099-03-10')
    await userEvent.click(screen.getByRole('button', { name: 'Save appointment' }))

    expect(await screen.findByText('Choose a doctor')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })
})
