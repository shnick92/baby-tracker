import { describe, it, expect } from 'vitest'
import { isOfflineError } from './offlineQueue'

// IndexedDB is not available in vitest's jsdom environment, so we only
// test the pure helper that doesn't touch the DB.

describe('isOfflineError', () => {
  it('returns true when error has no response (network failure)', () => {
    const axiosError = { response: undefined, message: 'Network Error' }
    expect(isOfflineError(axiosError)).toBe(true)
  })

  it('returns false when error has a response (server error)', () => {
    const axiosError = { response: { status: 500 }, message: 'Internal Server Error' }
    expect(isOfflineError(axiosError)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isOfflineError(null)).toBe(false)
  })

  it('returns false for a plain string', () => {
    expect(isOfflineError('network error')).toBe(false)
  })

  it('returns false for an object without a response key', () => {
    expect(isOfflineError({ message: 'Something went wrong' })).toBe(false)
  })
})
