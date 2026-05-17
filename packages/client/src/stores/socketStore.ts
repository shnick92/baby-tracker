import { create } from 'zustand'
import type { SocketStatus } from '@tracker/shared'

interface SocketState {
  status: SocketStatus
  setStatus: (status: SocketStatus) => void
}

export const useSocketStore = create<SocketState>((set) => ({
  status: 'connecting',
  setStatus: (status) => set({ status }),
}))
