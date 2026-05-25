const TZ = process.env.TIMEZONE ?? 'UTC'

// Formats a UTC Date as YYYY-MM-DD in the configured local timezone.
// en-CA locale gives ISO-format date output without any extra separators.
export function toLocalDay(utcDate: Date): string {
  return utcDate.toLocaleDateString('en-CA', { timeZone: TZ })
}

// Returns the UTC start and end timestamps that bracket the local calendar day
// identified by dateStr (YYYY-MM-DD). Handles DST by sampling at noon UTC.
export function localDayBoundsUTC(dateStr: string): [Date, Date] {
  // Sample at noon UTC on the target date — safe from DST transitions at midnight
  const probe = new Date(`${dateStr}T12:00:00Z`)

  // sv-SE locale gives "YYYY-MM-DD HH:MM:SS" — ISO-parseable after space→T + Z suffix
  const localNoon = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(probe)

  // offsetMs = UTC time of probe − the "fake UTC" interpretation of the local time string
  // e.g. probe=12:00 UTC, localNoon="2026-05-20 07:00:00" → offsetMs = +5 hours
  const offsetMs = probe.getTime() - new Date(localNoon.replace(' ', 'T') + 'Z').getTime()

  const start = new Date(new Date(`${dateStr}T00:00:00Z`).getTime() + offsetMs)
  const end = new Date(new Date(`${dateStr}T23:59:59.999Z`).getTime() + offsetMs)
  return [start, end]
}
