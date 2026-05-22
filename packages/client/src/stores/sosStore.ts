import { create } from 'zustand'

type IncomingAlert = {
  alertId: string
  senderName: string
  message: string | null
  sentAt: string
}

type SosState = {
  // Outbound cooldown
  cooldownUntil: number | null
  setCooldown: () => void

  // Inbound alert overlay
  incomingAlert: IncomingAlert | null
  showAlert: (alert: IncomingAlert) => void
  dismissAlert: () => void
}

export const useSosStore = create<SosState>((set) => ({
  cooldownUntil: null,
  setCooldown: () => set({ cooldownUntil: Date.now() + 60_000 }),

  incomingAlert: null,
  showAlert: (alert) => set({ incomingAlert: alert }),
  dismissAlert: () => set({ incomingAlert: null }),
}))
