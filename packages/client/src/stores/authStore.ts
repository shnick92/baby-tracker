import { create } from 'zustand'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  hasPasskey: boolean
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  babyId: string | null
  birthDate: string | null
  isBootstrapping: boolean
  setAuth: (token: string, user: AuthUser, babyId: string | null, birthDate?: string | null) => void
  setAccessToken: (token: string) => void
  setBootstrapped: () => void
  markPasskeyAdded: () => void
  setBirthDate: (birthDate: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  babyId: null,
  birthDate: null,
  isBootstrapping: true,
  setAuth: (token, user, babyId, birthDate = null) =>
    set({ accessToken: token, user, babyId, birthDate, isBootstrapping: false }),
  setAccessToken: (token) => set({ accessToken: token }),
  setBootstrapped: () => set({ isBootstrapping: false }),
  markPasskeyAdded: () => set((s) => ({ user: s.user ? { ...s.user, hasPasskey: true } : null })),
  setBirthDate: (birthDate) => set({ birthDate }),
  logout: () => set({ accessToken: null, user: null, babyId: null, birthDate: null, isBootstrapping: false }),
}))
