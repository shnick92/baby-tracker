import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@test/utils'
import { api } from '@lib/axios'

vi.mock('@lib/axios', () => ({ api: { patch: vi.fn() } }))
vi.mock('@lib/socket', () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }))
vi.mock('@stores/authStore', () => ({
  useAuthStore: () => ({ babyId: 'b1', user: { id: 'u1', name: 'Nick' } }),
}))

// Silence AudioContext — not available in jsdom
vi.stubGlobal('AudioContext', undefined)

import { SOSAlert } from './SOSAlert'
import { useSosStore } from '@stores/sosStore'

const stubAlert = {
  alertId: 'a1',
  senderName: 'Jessica Stone',
  message: 'Baby won\'t stop crying',
  sentAt: new Date().toISOString(),
}

describe('SOSAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSosStore.setState({ incomingAlert: null, cooldownUntil: null })
  })

  it('renders nothing when there is no incoming alert', () => {
    const { container } = renderWithProviders(<SOSAlert />)
    expect(container.firstChild).toBeNull()
  })

  it('renders EMERGENCY ALERT when an alert is active', () => {
    useSosStore.setState({ incomingAlert: stubAlert })
    renderWithProviders(<SOSAlert />)
    expect(screen.getByText('EMERGENCY ALERT')).toBeInTheDocument()
  })

  it('shows the sender first name', () => {
    useSosStore.setState({ incomingAlert: stubAlert })
    renderWithProviders(<SOSAlert />)
    expect(screen.getByText('From Jessica')).toBeInTheDocument()
  })

  it('renders the alert message when present', () => {
    useSosStore.setState({ incomingAlert: stubAlert })
    renderWithProviders(<SOSAlert />)
    expect(screen.getByText("Baby won't stop crying")).toBeInTheDocument()
  })

  it('does not render a message bubble when message is null', () => {
    useSosStore.setState({ incomingAlert: { ...stubAlert, message: null } })
    renderWithProviders(<SOSAlert />)
    expect(screen.queryByText("Baby won't stop crying")).not.toBeInTheDocument()
  })

  it('calls PATCH acknowledge and dismisses on acknowledge button click', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      data: {
        data: {
          alert: {
            id: 'a1', babyId: 'b1', status: 'ACKNOWLEDGED',
            sentBy: { id: 'u2', name: 'Jessica Stone' },
            sentTo: { id: 'u1', name: 'Nick' },
          },
        },
        error: null,
      },
    })
    useSosStore.setState({ incomingAlert: stubAlert })
    renderWithProviders(<SOSAlert />)

    await userEvent.click(screen.getByRole('button', { name: /acknowledge/i }))

    expect(api.patch).toHaveBeenCalledWith('/api/alerts/a1/acknowledge')
    // After mutation settles, incomingAlert should be cleared
    expect(useSosStore.getState().incomingAlert).toBeNull()
  })

  it('shows the footer note with sender first name', () => {
    useSosStore.setState({ incomingAlert: stubAlert })
    renderWithProviders(<SOSAlert />)
    expect(screen.getByText('Jessica will see when you acknowledge')).toBeInTheDocument()
  })

  it('dismisses without acknowledging when dismiss button is clicked', async () => {
    useSosStore.setState({ incomingAlert: stubAlert })
    renderWithProviders(<SOSAlert />)
    await userEvent.click(screen.getByRole('button', { name: /dismiss without acknowledging/i }))
    expect(useSosStore.getState().incomingAlert).toBeNull()
    expect(api.patch).not.toHaveBeenCalled()
  })
})
