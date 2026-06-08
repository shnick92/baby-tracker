// WHO Length/Height-for-Age reference curves, 0–6 months.
// Values are averages of WHO boys and girls charts, in inches.
// Source: WHO Child Growth Standards
// P3 / P50 / P97 percentiles at whole-month intervals.

const CM_TO_IN = 0.393701

type WhoHeightPoint = { ageDays: number; p3: number; p50: number; p97: number }

// cm values: avg of WHO boys + girls for P3, P50, P97
const WHO_CM: { ageDays: number; p3: number; p50: number; p97: number }[] = [
  { ageDays: 0,   p3: 46.1, p50: 49.9, p97: 53.4 },
  { ageDays: 30,  p3: 50.2, p50: 54.5, p97: 58.6 },
  { ageDays: 61,  p3: 53.8, p50: 58.2, p97: 62.6 },
  { ageDays: 91,  p3: 56.7, p50: 61.7, p97: 66.4 },
  { ageDays: 122, p3: 59.4, p50: 64.4, p97: 69.4 },
  { ageDays: 152, p3: 61.3, p50: 66.2, p97: 71.6 },
  { ageDays: 183, p3: 62.8, p50: 67.8, p97: 73.2 },
]

export const WHO_HEIGHT_DATA: WhoHeightPoint[] = WHO_CM.map((d) => ({
  ageDays: d.ageDays,
  p3:  Math.round(d.p3  * CM_TO_IN * 10) / 10,
  p50: Math.round(d.p50 * CM_TO_IN * 10) / 10,
  p97: Math.round(d.p97 * CM_TO_IN * 10) / 10,
}))

export function interpolateWhoHeight(ageDays: number): WhoHeightPoint | null {
  if (ageDays < 0 || ageDays > 183) return null
  const after = WHO_HEIGHT_DATA.find((d) => d.ageDays >= ageDays)
  if (!after) return WHO_HEIGHT_DATA[WHO_HEIGHT_DATA.length - 1] ?? null
  if (after.ageDays === ageDays) return after
  const before = WHO_HEIGHT_DATA[WHO_HEIGHT_DATA.indexOf(after) - 1]
  if (!before) return after
  const t = (ageDays - before.ageDays) / (after.ageDays - before.ageDays)
  return {
    ageDays,
    p3:  Math.round((before.p3  + t * (after.p3  - before.p3))  * 10) / 10,
    p50: Math.round((before.p50 + t * (after.p50 - before.p50)) * 10) / 10,
    p97: Math.round((before.p97 + t * (after.p97 - before.p97)) * 10) / 10,
  }
}
