import { create } from 'zustand'
import type { SocketStatus } from '@tracker/shared'

interface SocketState {
  status: SocketStatus
  offlineQueueCount: number
  setStatus: (status: SocketStatus) => void
  setOfflineQueueCount: (count: number) => void
}

export const useSocketStore = create<SocketState>((set) => ({
  status: 'connecting',
  offlineQueueCount: 0,
  setStatus: (status) => set({ status }),
  setOfflineQueueCount: (offlineQueueCount) => set({ offlineQueueCount }),
}))
