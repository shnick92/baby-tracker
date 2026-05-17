import { vi } from 'vitest'

export const mockSocket = { on: vi.fn(), off: vi.fn(), emit: vi.fn() }
export const getSocket = vi.fn(() => mockSocket)
export const connectSocket = vi.fn()
export const disconnectSocket = vi.fn()
