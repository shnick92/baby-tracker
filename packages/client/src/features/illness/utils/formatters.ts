export const FEVER_F = 100.4

export function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' · ' + formatTime(iso)
}

export function toC(f: number): string { return ((f - 32) * 5 / 9).toFixed(1) }

export const METHOD_LABEL: Record<string, string> = {
  FOREHEAD: 'Forehead',
  EAR: 'Ear',
  RECTAL: 'Rectal',
  AXILLARY: 'Armpit',
  ORAL: 'Oral',
}
