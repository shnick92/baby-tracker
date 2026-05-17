import { create } from 'zustand'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  babyId: string | null
  isBootstrapping: boolean
  setAuth: (token: string, user: AuthUser, babyId: string | null) => void
  setAccessToken: (token: string) => void
  setBootstrapped: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  babyId: null,
  isBootstrapping: true,
  setAuth: (token, user, babyId) => set({ accessToken: token, user, babyId, isBootstrapping: false }),
  setAccessToken: (token) => set({ accessToken: token }),
  setBootstrapped: () => set({ isBootstrapping: false }),
  logout: () => set({ accessToken: null, user: null, babyId: null, isBootstrapping: false }),
}))
