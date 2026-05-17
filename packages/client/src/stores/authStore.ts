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
  setAuth: (token: string, user: AuthUser, babyId: string | null) => void
  setAccessToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  babyId: null,
  setAuth: (token, user, babyId) => set({ accessToken: token, user, babyId }),
  setAccessToken: (token) => set({ accessToken: token }),
  logout: () => set({ accessToken: null, user: null, babyId: null }),
}))
