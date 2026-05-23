// WHO Weight-for-Age reference curves, 0–6 months.
// Values are averages of WHO boys and girls charts, converted to lbs.
// Source: WHO Child Growth Standards (https://www.who.int/tools/child-growth-standards)
// P3 / P50 / P97 percentiles at whole-month intervals.

const KG_TO_LBS = 2.20462

type WhoPoint = { ageDays: number; p3: number; p50: number; p97: number }

// kg values: avg of WHO boys + girls for P3, P50, P97
const WHO_KG: { ageDays: number; p3: number; p50: number; p97: number }[] = [
  { ageDays: 0,   p3: 2.45, p50: 3.3,  p97: 4.3  },
  { ageDays: 30,  p3: 3.3,  p50: 4.65, p97: 6.15 },
  { ageDays: 61,  p3: 4.15, p50: 5.75, p97: 7.6  },
  { ageDays: 91,  p3: 4.8,  p50: 6.55, p97: 8.65 },
  { ageDays: 122, p3: 5.3,  p50: 7.2,  p97: 9.45 },
  { ageDays: 152, p3: 5.7,  p50: 7.7,  p97: 10.05 },
  { ageDays: 183, p3: 5.9,  p50: 8.05, p97: 10.5 },
]

export const WHO_DATA: WhoPoint[] = WHO_KG.map((d) => ({
  ageDays: d.ageDays,
  p3:  Math.round(d.p3  * KG_TO_LBS * 10) / 10,
  p50: Math.round(d.p50 * KG_TO_LBS * 10) / 10,
  p97: Math.round(d.p97 * KG_TO_LBS * 10) / 10,
}))

// Linear interpolation of WHO reference at a given age in days
export function interpolateWho(ageDays: number): WhoPoint | null {
  if (ageDays < 0 || ageDays > 183) return null
  const after = WHO_DATA.find((d) => d.ageDays >= ageDays)
  if (!after) return WHO_DATA[WHO_DATA.length - 1] ?? null
  if (after.ageDays === ageDays) return after
  const before = WHO_DATA[WHO_DATA.indexOf(after) - 1]
  if (!before) return after
  const t = (ageDays - before.ageDays) / (after.ageDays - before.ageDays)
  return {
    ageDays,
    p3:  Math.round((before.p3  + t * (after.p3  - before.p3))  * 10) / 10,
    p50: Math.round((before.p50 + t * (after.p50 - before.p50)) * 10) / 10,
    p97: Math.round((before.p97 + t * (after.p97 - before.p97)) * 10) / 10,
  }
}
