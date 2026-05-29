import { describe, it, expect, vi, beforeEach } from 'vitest'
import { commitParsedLog } from './api'
import { api } from '@lib/axios'

// @lib/axios is mocked globally in src/test/setup.ts
const mockPost = vi.mocked(api.post)
const mockPatch = vi.mocked(api.patch)

beforeEach(() => vi.clearAllMocks())

describe('commitParsedLog — illness_start', () => {
  it('sends symptoms as string[], not { label }[]', async () => {
    mockPost.mockResolvedValue({ data: { data: { id: 'ep-1' }, error: null } })

    await commitParsedLog('baby-1', {
      type: 'illness_start',
      summary: 'Baby is sick',
      confidence: 0.9,
      data: { symptoms: ['fever', 'runny nose'] },
    })

    expect(mockPost).toHaveBeenCalledWith('/api/illness', {
      babyId: 'baby-1',
      symptoms: ['fever', 'runny nose'],
      notes: undefined,
    })
  })

  it('returns the episodeId from the response', async () => {
    mockPost.mockResolvedValue({ data: { data: { id: 'ep-42' }, error: null } })

    const result = await commitParsedLog('baby-1', {
      type: 'illness_start',
      summary: 'Starting episode',
      confidence: 0.8,
      data: {},
    })

    expect(result).toEqual({ episodeId: 'ep-42' })
  })

  it('sends empty symptoms array when none are parsed', async () => {
    mockPost.mockResolvedValue({ data: { data: { id: 'ep-2' }, error: null } })

    await commitParsedLog('baby-1', {
      type: 'illness_start',
      summary: 'Baby sick',
      confidence: 0.7,
      data: {},
    })

    expect(mockPost).toHaveBeenCalledWith('/api/illness', {
      babyId: 'baby-1',
      symptoms: [],
      notes: undefined,
    })
  })

  it('forwards optional notes', async () => {
    mockPost.mockResolvedValue({ data: { data: { id: 'ep-3' }, error: null } })

    await commitParsedLog('baby-1', {
      type: 'illness_start',
      summary: 'Baby sick with note',
      confidence: 0.85,
      data: { symptoms: ['cough'], notes: 'Started this morning' },
    })

    expect(mockPost).toHaveBeenCalledWith('/api/illness', {
      babyId: 'baby-1',
      symptoms: ['cough'],
      notes: 'Started this morning',
    })
  })
})

describe('commitParsedLog — temperature', () => {
  it('POSTs to /api/illness/temperature with tempF and default method', async () => {
    mockPost.mockResolvedValue({ data: { data: {}, error: null } })

    const result = await commitParsedLog('baby-1', {
      type: 'temperature',
      summary: 'Temp: 101.5°F',
      confidence: 0.95,
      data: { tempF: 101.5 },
    })

    expect(mockPost).toHaveBeenCalledWith('/api/illness/temperature', expect.objectContaining({
      babyId: 'baby-1',
      tempF: 101.5,
      method: 'FOREHEAD',
    }))
    expect(result).toEqual({})
  })

  it('forwards parsed method when provided', async () => {
    mockPost.mockResolvedValue({ data: { data: {}, error: null } })

    await commitParsedLog('baby-1', {
      type: 'temperature',
      summary: 'Ear temp: 99.8°F',
      confidence: 0.9,
      data: { tempF: 99.8, method: 'EAR' },
    })

    expect(mockPost).toHaveBeenCalledWith('/api/illness/temperature', expect.objectContaining({
      method: 'EAR',
    }))
  })

  it('also logs a temperature when illness_start includes a tempF', async () => {
    // First call creates the episode, second logs the temp
    mockPost
      .mockResolvedValueOnce({ data: { data: { id: 'ep-10' }, error: null } })
      .mockResolvedValueOnce({ data: { data: {}, error: null } })

    await commitParsedLog('baby-1', {
      type: 'illness_start',
      summary: 'Baby sick with 101°F fever',
      confidence: 0.9,
      data: { symptoms: ['fever'], tempF: 101.0 },
    })

    expect(mockPost).toHaveBeenCalledTimes(2)
    expect(mockPost).toHaveBeenNthCalledWith(2, '/api/illness/ep-10/temperature', expect.objectContaining({
      tempF: 101.0,
    }))
  })
})

describe('commitParsedLog — other types return {}', () => {
  it('returns {} for feeding_bottle', async () => {
    mockPost.mockResolvedValue({ data: { data: {}, error: null } })
    const result = await commitParsedLog('baby-1', {
      type: 'feeding_bottle',
      summary: '3oz bottle',
      confidence: 1,
      data: { volumeOz: 3 },
    })
    expect(result).toEqual({})
  })

  it('returns {} for diaper', async () => {
    mockPost.mockResolvedValue({ data: { data: {}, error: null } })
    const result = await commitParsedLog('baby-1', {
      type: 'diaper',
      summary: 'Wet diaper',
      confidence: 1,
      data: { diaperType: 'WET' },
    })
    expect(result).toEqual({})
  })
})

describe('commitParsedLog — feeding_breast', () => {
  it('calls start then end with computed endedAt from durationSec', async () => {
    mockPost.mockResolvedValue({ data: { data: { id: 'f-1' }, error: null } })
    mockPatch.mockResolvedValue({ data: { data: {}, error: null } })

    const startedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    await commitParsedLog('baby-1', {
      type: 'feeding_breast',
      summary: 'Left breast 10 min',
      confidence: 0.95,
      data: { side: 'BREAST_LEFT', startedAt, durationSec: 600 },
    })

    expect(mockPost).toHaveBeenCalledWith('/api/feeding/start', expect.objectContaining({ type: 'BREAST_LEFT' }))
    expect(mockPatch).toHaveBeenCalledWith(`/api/feeding/f-1/end`, expect.objectContaining({ endedAt: expect.any(String) }))
  })
})
