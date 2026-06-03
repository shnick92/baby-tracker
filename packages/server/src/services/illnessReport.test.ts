import { describe, it, expect } from 'vitest'
import { renderIllnessReportText, renderIllnessReportPdf } from './illnessReport'
import type { IllnessReportData } from './illnessReport'

const BASE_EPISODE: IllnessReportData = {
  episodeId: 'ep1',
  babyName: 'Aria',
  reporterName: 'Nick',
  startedAt: new Date('2026-05-20T06:14:00Z'),
  endedAt: new Date('2026-05-22T15:30:00Z'),
  notes: 'Very fussy overnight, temp spiked at 2am.',
  symptoms: [
    { label: 'Fever' },
    { label: 'Runny Nose' },
  ],
  temperatureLogs: [
    { tempF: 103.4, method: 'FOREHEAD', recordedAt: new Date('2026-05-20T06:14:00Z'), notes: null },
    { tempF: 101.8, method: 'EAR', recordedAt: new Date('2026-05-20T10:00:00Z'), notes: null },
    { tempF: 99.2, method: 'FOREHEAD', recordedAt: new Date('2026-05-22T14:00:00Z'), notes: null },
  ],
  medicationLogs: [
    { name: 'Infant Tylenol', dosageNote: '0.4 mL', dosageMg: 5, givenAt: new Date('2026-05-20T06:30:00Z'), notes: null },
    { name: 'Infant Tylenol', dosageNote: '0.4 mL', dosageMg: 5, givenAt: new Date('2026-05-20T12:30:00Z'), notes: null },
  ],
  feedingLogs: [
    { type: 'BOTTLE', startedAt: new Date('2026-05-20T07:00:00Z'), endedAt: new Date('2026-05-20T07:15:00Z'), volumeOz: 2, durationSec: null, notes: null },
    { type: 'BREAST_LEFT', startedAt: new Date('2026-05-21T08:00:00Z'), endedAt: null, volumeOz: null, durationSec: 600, notes: null },
  ],
  sleepLogs: [
    { type: 'NIGHT', startedAt: new Date('2026-05-21T00:00:00Z'), endedAt: new Date('2026-05-21T05:00:00Z'), notes: null },
  ],
  diaperLogs: [
    { type: 'WET', occurredAt: new Date('2026-05-20T08:00:00Z'), notes: null },
    { type: 'DIRTY', occurredAt: new Date('2026-05-21T09:00:00Z'), notes: null },
  ],
  moodLogs: [
    { mood: 'Fussy', occurredAt: new Date('2026-05-20T06:00:00Z'), notes: 'Very clingy' },
  ],
}

const MINIMAL_EPISODE: IllnessReportData = {
  episodeId: 'ep2',
  babyName: null,
  reporterName: 'Jess',
  startedAt: new Date('2026-05-25T10:00:00Z'),
  endedAt: null,
  notes: null,
  symptoms: [],
  temperatureLogs: [],
  medicationLogs: [],
  feedingLogs: [],
  sleepLogs: [],
  diaperLogs: [],
  moodLogs: [],
}

describe('renderIllnessReportText', () => {
  it('includes baby name, episode dates, and status', () => {
    const text = renderIllnessReportText(BASE_EPISODE)
    expect(text).toContain('DOCTOR HANDOFF REPORT')
    expect(text).toContain('Aria')
    expect(text).toContain('Resolved')
    expect(text).toContain('Nick')
  })

  it('shows peak temperature in the summary', () => {
    const text = renderIllnessReportText(BASE_EPISODE)
    expect(text).toContain('103.4')
    expect(text).toContain('39.7')
  })

  it('lists all symptoms', () => {
    const text = renderIllnessReportText(BASE_EPISODE)
    expect(text).toContain('Fever')
    expect(text).toContain('Runny Nose')
  })

  it('includes all temperature readings in chronological order', () => {
    const text = renderIllnessReportText(BASE_EPISODE)
    const i103 = text.indexOf('103.4')
    const i101 = text.indexOf('101.8')
    const i99 = text.indexOf('99.2')
    expect(i103).toBeGreaterThan(-1)
    expect(i101).toBeGreaterThan(i103)
    expect(i99).toBeGreaterThan(i101)
  })

  it('groups medications by name', () => {
    const text = renderIllnessReportText(BASE_EPISODE)
    expect(text).toContain('Infant Tylenol (0.4 mL)')
  })

  it('includes notes section', () => {
    const text = renderIllnessReportText(BASE_EPISODE)
    expect(text).toContain('Very fussy overnight')
  })

  it('includes the disclaimer', () => {
    const text = renderIllnessReportText(BASE_EPISODE)
    expect(text).toContain('not an official medical record')
  })

  it('handles ongoing episode (no endedAt)', () => {
    const text = renderIllnessReportText(MINIMAL_EPISODE)
    expect(text).toContain('Ongoing')
    expect(text).not.toContain('Ended:')
  })

  it('uses "Baby" when no baby name is set', () => {
    const text = renderIllnessReportText(MINIMAL_EPISODE)
    expect(text).toContain('Baby')
  })

  it('omits empty sections gracefully', () => {
    const text = renderIllnessReportText(MINIMAL_EPISODE)
    expect(text).not.toContain('SYMPTOMS')
    expect(text).not.toContain('TEMPERATURE LOG')
    expect(text).not.toContain('MEDICATIONS')
    expect(text).not.toContain('NOTES')
  })

  it('includes chronological log with feeding, diaper, and mood entries', () => {
    const text = renderIllnessReportText(BASE_EPISODE)
    expect(text).toContain('CHRONOLOGICAL LOG')
    expect(text).toContain('Bottle')
    expect(text).toContain('Wet')
    expect(text).toContain('Fussy')
  })
})

describe('renderIllnessReportPdf', () => {
  it('resolves to a non-empty Buffer', async () => {
    const buffer = await renderIllnessReportPdf(BASE_EPISODE)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(1000)
  })

  it('starts with the PDF magic bytes (%PDF)', async () => {
    const buffer = await renderIllnessReportPdf(BASE_EPISODE)
    expect(buffer.slice(0, 4).toString()).toBe('%PDF')
  })

  it('generates a valid PDF for a minimal episode', async () => {
    const buffer = await renderIllnessReportPdf(MINIMAL_EPISODE)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.slice(0, 4).toString()).toBe('%PDF')
  })
})
