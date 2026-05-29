import { expect, afterEach, vi } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'

expect.extend(matchers)

afterEach(() => {
  cleanup()
})

// ── Global module mocks ────────────────────────────────────────────────────
// These apply to every test file. Individual tests can override per-call with
// vi.mocked(api.get).mockResolvedValue(...) or vi.mocked(useAuthStore).mockImplementation(...)

vi.mock('@lib/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@lib/socket', () => ({
  getSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }),
}))

// Default: logged-in parent in baby mode. Tests needing pregnancy mode can override:
//   vi.mocked(useAuthStore).mockImplementation(s => s({ ...defaults, birthDate: null }))
vi.mock('@stores/authStore', () => ({
  useAuthStore: vi.fn((sel: (s: object) => unknown) =>
    sel({
      babyId: 'b1',
      user: { id: 'u1', name: 'Nick', email: 'nick@example.com', role: 'PARENT', hasPasskey: false },
      birthDate: '2026-05-01T00:00:00.000Z',
      accessToken: 'tok',
      isBootstrapping: false,
    }),
  ),
}))
