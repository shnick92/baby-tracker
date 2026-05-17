import { vi } from 'vitest'

export const useAuthStore = vi.fn(
  (selector: (s: { babyId: string; user: null }) => unknown) =>
    selector({ babyId: 'test-baby', user: null }),
)
