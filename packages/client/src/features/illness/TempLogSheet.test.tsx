import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@test/utils'
import { api } from '@lib/axios'
import { TempLogSheet } from './TempLogSheet'

// @lib/axios, @lib/socket, @stores/authStore are mocked globally in src/test/setup.ts

vi.mock('@hooks/useSwipeDown', () => ({ useSwipeDown: () => ({ current: null }) }))

const onClose = vi.fn()

beforeEach(() => vi.clearAllMocks())

describe('TempLogSheet', () => {
  it('renders with default 98.6°F value', () => {
    renderWithProviders(<TempLogSheet episodeId="ep-1" onClose={onClose} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    expect(input.value).toBe('98.6')
  })

  it('shows fever callout when value is at or above 100.4°F', async () => {
    renderWithProviders(<TempLogSheet episodeId="ep-1" onClose={onClose} />)
    const input = screen.getByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.type(input, '101.2')
    expect(screen.getByText(/Above fever threshold/i)).toBeInTheDocument()
  })

  it('does not show fever callout for normal temperature', async () => {
    renderWithProviders(<TempLogSheet episodeId="ep-1" onClose={onClose} />)
    const input = screen.getByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.type(input, '98.6')
    expect(screen.queryByText(/Above fever threshold/i)).not.toBeInTheDocument()
  })

  it('converts value from °F to °C when unit is toggled', async () => {
    renderWithProviders(<TempLogSheet episodeId="ep-1" onClose={onClose} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    // Default is 98.6°F; switch to °C should show 37.0
    await userEvent.click(screen.getByText('°C'))
    expect(parseFloat(input.value)).toBeCloseTo(37.0, 0)
  })

  it('converts value from °C back to °F when toggled back', async () => {
    renderWithProviders(<TempLogSheet episodeId="ep-1" onClose={onClose} />)
    const input = screen.getByRole('spinbutton') as HTMLInputElement
    await userEvent.click(screen.getByText('°C'))
    await userEvent.click(screen.getByText('°F'))
    expect(parseFloat(input.value)).toBeCloseTo(98.6, 0)
  })

  it('calls POST /api/illness/:id/temperature on save', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: {}, error: null } })
    renderWithProviders(<TempLogSheet episodeId="ep-1" onClose={onClose} />)
    await userEvent.click(screen.getByText('Save Reading'))
    expect(api.post).toHaveBeenCalledWith(
      '/api/illness/ep-1/temperature',
      expect.objectContaining({ tempF: 98.6 }),
    )
  })

  it('calls onClose when Cancel is tapped', async () => {
    renderWithProviders(<TempLogSheet episodeId="ep-1" onClose={onClose} />)
    await userEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('save button is disabled when input is empty', async () => {
    renderWithProviders(<TempLogSheet episodeId="ep-1" onClose={onClose} />)
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '' } })
    expect(screen.getByText('Save Reading')).toBeDisabled()
  })
})
