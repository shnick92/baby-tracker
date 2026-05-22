import { create } from 'zustand'

type Toast = { id: number; message: string }

type ToastStore = {
  toasts: Toast[]
  show: (message: string) => void
  dismiss: (id: number) => void
}

let _nextId = 0

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (message) => {
    const id = ++_nextId
    set((s) => ({ toasts: [...s.toasts, { id, message }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
