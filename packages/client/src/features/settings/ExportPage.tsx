import { useState } from 'react'
import { Download, Droplets, FileText, Moon, Pill, Scale, Table } from 'lucide-react'
import type { ExportDataType, HealthSummarySection } from '@tracker/shared'
import {
  EXPORT_DATA_TYPES,
  EXPORT_DATA_TYPE_LABELS,
  HEALTH_SUMMARY_SECTIONS,
  HEALTH_SUMMARY_SECTION_LABELS,
} from '@tracker/shared'

import { api } from '@lib/axios'
import { useAuthStore } from '@stores/authStore'
import { useToastStore } from '@stores/toastStore'
import { TextLineSkeleton } from '@components/skeletons'
import { BabyBottleIcon } from '@components/icons'

import { useExportPreview } from './useExportPreview'
import { downloadBlob } from './utils/downloadBlob'
import { Toggle } from './components/Toggle'

const cardCls = 'bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700'
const sectionLabelCls = 'text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-1 mb-2'

const TYPE_ICONS: Record<ExportDataType, React.ReactNode> = {
  feeding: <BabyBottleIcon size={18} />,
  sleep: <Moon size={18} />,
  diaper: <Droplets size={18} />,
  growth: <Scale size={18} />,
  medication: <Pill size={18} />,
  tummyTime: <span className="text-base leading-none">🐢</span>,
  mood: <span className="text-base leading-none">😊</span>,
}

type QuickRange = { label: string; days: number | 'all' }
const QUICK_RANGES: QuickRange[] = [
  { label: 'Today', days: 0 },
  { label: '7 days', days: 6 },
  { label: '30 days', days: 29 },
  { label: 'All time', days: 'all' },
]

function toDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toDay(d)
}

// All-time lower bound: well before any conceivable log
const ALL_TIME_FROM = '2020-01-01'

export function ExportContent() {
  const babyId = useAuthStore((s) => s.babyId)
  const showToast = useToastStore((s) => s.show)

  const [tab, setTab] = useState<'raw' | 'health'>('raw')

  // Raw export state
  const [from, setFrom] = useState(daysAgo(6))
  const [to, setTo] = useState(toDay(new Date()))
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf')
  const [types, setTypes] = useState<ExportDataType[]>([...EXPORT_DATA_TYPES])
  const [downloading, setDownloading] = useState(false)

  // Health summary state
  const [sections, setSections] = useState<HealthSummarySection[]>([...HEALTH_SUMMARY_SECTIONS])

  const preview = useExportPreview(babyId, types, from, to)

  const toggleType = (t: ExportDataType) =>
    setTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const toggleSection = (s: HealthSummarySection) =>
    setSections((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  const applyQuickRange = (r: QuickRange) => {
    setTo(toDay(new Date()))
    setFrom(r.days === 'all' ? ALL_TIME_FROM : daysAgo(r.days))
  }

  const activeQuickRange = QUICK_RANGES.find((r) =>
    r.days === 'all'
      ? from === ALL_TIME_FROM && to === toDay(new Date())
      : from === daysAgo(r.days) && to === toDay(new Date()),
  )

  const rangeDays = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1

  const download = async (url: string, fallbackName: string) => {
    setDownloading(true)
    try {
      const res = await api.get<Blob>(url, { responseType: 'blob' })
      downloadBlob(res.data, res.headers['content-disposition'] as string | undefined, fallbackName)
    } catch {
      showToast('Export failed — please try again')
    } finally {
      setDownloading(false)
    }
  }

  const handleRawDownload = () =>
    download(
      `/api/export?babyId=${babyId}&types=${types.join(',')}&from=${from}&to=${to}&format=${format}`,
      `tracker-export.${format === 'pdf' ? 'pdf' : 'zip'}`,
    )

  const handleHealthDownload = () =>
    download(
      `/api/export/health-summary?babyId=${babyId}&sections=${sections.join(',')}`,
      'health-summary.pdf',
    )

  const inputCls =
    'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100'

  return (
    <div className="space-y-5">
        {/* Tab strip */}
        <div className="flex gap-2">
          {([
            ['raw', 'Raw Data'],
            ['health', 'Health Summary'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 rounded-full text-xs font-semibold min-h-[44px] transition-colors ${
                tab === key
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'raw' ? (
          <div className="md:grid md:grid-cols-2 md:gap-8 md:items-start space-y-5 md:space-y-0">
            <div className="space-y-5">
              <section>
                <p className={sectionLabelCls}>Date Range</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">From</span>
                    <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">To</span>
                    <input type="date" value={to} min={from} max={toDay(new Date())} onChange={(e) => setTo(e.target.value)} className={inputCls} />
                  </label>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {QUICK_RANGES.map((r) => (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() => applyQuickRange(r)}
                      className={`px-3.5 py-2 rounded-full text-xs font-semibold min-h-[36px] transition-colors ${
                        activeQuickRange?.label === r.label
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <p className={sectionLabelCls}>Include</p>
                <div className={`${cardCls} divide-y divide-gray-100 dark:divide-gray-700`}>
                  {EXPORT_DATA_TYPES.map((t) => (
                    <div key={t} className="flex items-center gap-3 px-4 py-3">
                      <span className="w-7 flex items-center justify-center text-gray-500 dark:text-gray-400">{TYPE_ICONS[t]}</span>
                      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {EXPORT_DATA_TYPE_LABELS[t]}
                      </span>
                      <Toggle checked={types.includes(t)} onChange={() => toggleType(t)} label={EXPORT_DATA_TYPE_LABELS[t]} />
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-5">
              <section>
                <p className={sectionLabelCls}>Format</p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['pdf', <FileText key="i" size={20} />, 'PDF', 'For pediatrician'],
                    ['csv', <Table key="i" size={20} />, 'CSV', 'Raw data'],
                  ] as const).map(([key, icon, name, desc]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormat(key)}
                      className={`${cardCls} p-4 text-left transition-colors min-h-[44px] ${
                        format === key ? '!border-emerald-500 ring-1 ring-emerald-500' : ''
                      }`}
                    >
                      <span className={format === key ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'}>{icon}</span>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-2">{name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{desc}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className={`${cardCls} p-4 bg-gray-50/50 dark:bg-gray-800/50`}>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">Export will include</p>
                  {preview.isLoading ? (
                    <TextLineSkeleton width="w-2/3" />
                  ) : preview.data ? (
                    <>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {rangeDays}-day {format.toUpperCase()} — {preview.data.total} record{preview.data.total === 1 ? '' : 's'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {types.map((t) => EXPORT_DATA_TYPE_LABELS[t]).join(' · ')}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500">Select at least one data type</p>
                  )}
                </div>
              </section>

              <button
                type="button"
                onClick={handleRawDownload}
                disabled={downloading || types.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold rounded-2xl py-3.5 min-h-[48px] transition-colors"
              >
                <Download size={16} />
                {downloading ? 'Preparing…' : `Download ${format.toUpperCase()}`}
              </button>
            </div>
          </div>
        ) : (
          <div className="md:max-w-md space-y-5">
            <section>
              <p className={sectionLabelCls}>Sections</p>
              <div className={`${cardCls} divide-y divide-gray-100 dark:divide-gray-700`}>
                {HEALTH_SUMMARY_SECTIONS.map((s) => (
                  <div key={s} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {HEALTH_SUMMARY_SECTION_LABELS[s]}
                    </span>
                    <Toggle checked={sections.includes(s)} onChange={() => toggleSection(s)} label={HEALTH_SUMMARY_SECTION_LABELS[s]} />
                  </div>
                ))}
              </div>
            </section>

            <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
              A short PDF suitable for handing to a pediatrician or daycare. Empty sections are
              omitted automatically. This is an informal record — not an official medical document.
            </p>

            <button
              type="button"
              onClick={handleHealthDownload}
              disabled={downloading || sections.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold rounded-2xl py-3.5 min-h-[48px] transition-colors"
            >
              <Download size={16} />
              {downloading ? 'Preparing…' : 'Download Health Summary'}
            </button>
          </div>
        )}
    </div>
  )
}

export function ExportPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Export Data</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">PDF & CSV exports for pediatrician visits</p>
      </header>
      <main className="max-w-lg md:max-w-4xl mx-auto px-4 py-6">
        <ExportContent />
      </main>
    </div>
  )
}
