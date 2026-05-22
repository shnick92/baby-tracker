import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@test/utils'
import { api } from '@lib/axios'

vi.mock('@lib/axios', () => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@lib/socket', () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }))
type AuthState = { babyId: string; user: { id: string; name: string } }
const AUTH_STATE: AuthState = { babyId: 'b1', user: { id: 'u1', name: 'Nick' } }
vi.mock('@stores/authStore', () => ({
  useAuthStore: (sel?: (s: AuthState) => unknown) => (sel ? sel(AUTH_STATE) : AUTH_STATE),
}))

// Import after mocks so the store starts fresh each test
import { SOSButton } from './SOSButton'
import { useSosStore } from '@stores/sosStore'

describe('SOSButton (icon variant)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the SOS store between tests
    useSosStore.setState({ cooldownUntil: null, incomingAlert: null })
  })

  it('renders the SOS label when not on cooldown', () => {
    renderWithProviders(<SOSButton babyId="b1" />)
    expect(screen.getByRole('button', { name: /sos/i })).toBeInTheDocument()
  })

  it('button is enabled when no cooldown is active', () => {
    renderWithProviders(<SOSButton babyId="b1" />)
    expect(screen.getByRole('button', { name: /sos/i })).not.toBeDisabled()
  })

  it('button is disabled when cooldown is active', () => {
    useSosStore.setState({ cooldownUntil: Date.now() + 30_000 })
    renderWithProviders(<SOSButton babyId="b1" />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows remaining seconds when cooldown is active', () => {
    useSosStore.setState({ cooldownUntil: Date.now() + 30_000 })
    renderWithProviders(<SOSButton babyId="b1" />)
    // Should show a number (remaining seconds), not "SOS"
    expect(screen.queryByText('SOS')).not.toBeInTheDocument()
    expect(screen.getByRole('button').textContent).toMatch(/\d+/)
  })

  it('opens the confirm sheet when clicked', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { alerts: [] }, error: null } })
    renderWithProviders(<SOSButton babyId="b1" />)
    await userEvent.click(screen.getByRole('button', { name: /sos/i }))
    expect(screen.getByText('Send emergency alert?')).toBeInTheDocument()
  })

  it('does not open confirm sheet when on cooldown', async () => {
    useSosStore.setState({ cooldownUntil: Date.now() + 30_000 })
    renderWithProviders(<SOSButton babyId="b1" />)
    await userEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('Send emergency alert?')).not.toBeInTheDocument()
  })
})

describe('SOSButton (full variant)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSosStore.setState({ cooldownUntil: null, incomingAlert: null })
  })

  it('renders "SOS Alert" label in full variant', () => {
    renderWithProviders(<SOSButton babyId="b1" variant="full" />)
    expect(screen.getByRole('button', { name: /sos alert/i })).toBeInTheDocument()
  })

  it('shows wait message in full variant when on cooldown', () => {
    useSosStore.setState({ cooldownUntil: Date.now() + 45_000 })
    renderWithProviders(<SOSButton babyId="b1" variant="full" />)
    expect(screen.getByRole('button').textContent).toMatch(/wait \d+s/i)
  })
})
