import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { makeClient, renderWithProviders } from '@test/utils'

import { QuickLogInput } from './QuickLogInput'
import { parseLog, commitParsedLog, type ParsedLogResult } from './api'

vi.mock('./api', () => ({ parseLog: vi.fn(), commitParsedLog: vi.fn() }))

const parsedAs = (type: ParsedLogResult['type']): ParsedLogResult => ({
  type,
  confidence: 0.9,
  summary: 'Parsed log',
  data: {},
})

describe('QuickLogInput', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    ['diaper', 'diaperLogs'],
    ['sleep', 'sleepLogs'],
    ['medication', 'medicationLogs'],
    ['tummy_time', 'tummyTimeLogs'],
  ] as const)('refreshes the %s list after saving', async (type, key) => {
    vi.mocked(parseLog).mockResolvedValue(parsedAs(type))
    vi.mocked(commitParsedLog).mockResolvedValue({})
    const client = makeClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    renderWithProviders(<QuickLogInput babyId="b1" />, client)
    await userEvent.type(screen.getByRole('textbox'), 'some log')
    await userEvent.keyboard('{Enter}')
    await userEvent.click(await screen.findByText('Save'))

    await screen.findByText('Logged successfully!')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [key, 'b1'] })
  })
})
