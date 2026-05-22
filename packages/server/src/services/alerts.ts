export const COOLDOWN_MS = 60_000

export function calcCooldownRemainingSec(sentAt: Date, nowMs: number = Date.now()): number {
  const remainingMs = COOLDOWN_MS - (nowMs - sentAt.getTime())
  return Math.max(0, Math.ceil(remainingMs / 1000))
}

export function isOnCooldown(sentAt: Date, nowMs: number = Date.now()): boolean {
  return nowMs - sentAt.getTime() < COOLDOWN_MS
}
