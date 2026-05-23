import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

import { useAuthStore } from '@stores/authStore'
import { TrashIcon, PencilIcon } from '@components/icons'

import { useWeightLogs, totalLbs, formatWeight } from './useWeightLogs'
import { WeightSkeleton } from './WeightSkeleton'
import { WHO_DATA, interpolateWho } from './whoData'
import type { WeightLog } from './useWeightLogs'

const inputCls =
  'w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500'

const logSchema = z.object({
  lbs: z
    .number({ invalid_type_error: 'Enter whole pounds' })
    .int('Whole pounds only')
    .min(0, 'Min 0 lbs')
    .max(50, 'Max 50 lbs'),
  oz: z
    .number({ invalid_type_error: 'Enter ounces' })
    .min(0, 'Min 0 oz')
    .max(15.9, 'Max 15.9 oz'),
  recordedAt: z.string().optional(),
  notes: z.string().max(500, 'Max 500 characters').optional(),
})
type LogFormValues = z.infer<typeof logSchema>

function toLocalDateValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Build a single merged array: WHO monthly points + actual measurement points.
// At every point, WHO values are filled in (interpolated where needed) so the
// tooltip always shows baby weight vs. all three percentiles together.
// The baby weight line uses connectNulls so it stays continuous through WHO-only rows.
function buildChartData(logs: WeightLog[], birthDate: Date) {
  const actualMap = new Map<number, number>()
  for (const log of logs) {
    const ageDays = Math.round(
      (new Date(log.recordedAt).getTime() - birthDate.getTime()) / 86_400_000,
    )
    if (ageDays >= 0 && ageDays <= 200) {
      actualMap.set(ageDays, Math.round(totalLbs(log) * 100) / 100)
    }
  }

  const allDays = new Set([...WHO_DATA.map((d) => d.ageDays), ...actualMap.keys()])
  return Array.from(allDays)
    .sort((a, b) => a - b)
    .map((ageDays) => {
      const who = interpolateWho(ageDays)
      return {
        ageDays,
        p3: who?.p3,
        p50: who?.p50,
        p97: who?.p97,
        weight: actualMap.get(ageDays),
      }
    })
}

type ChartTooltipProps = {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: number
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length || label === undefined) return null
  // Only show tooltip when a baby weight point is active
  const weightEntry = payload.find((e) => e.name === 'Baby weight' && e.value != null)
  if (!weightEntry) return null
  const weeks = Math.round((label / 7) * 10) / 10
  const defined = payload.filter((e) => e.value != null)
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-gray-600 dark:text-gray-300 mb-1">Week {weeks}</p>
      {defined.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {Number(entry.value).toFixed(1)} lb
        </p>
      ))}
    </div>
  )
}

export function WeightPage() {
  const { babyId, birthDate: birthDateStr } = useAuthStore()
  const { logs, isLoading, logMutation, editMutation, deleteMutation } = useWeightLogs(babyId!)

  const [showForm, setShowForm] = useState(false)
  const [editingLog, setEditingLog] = useState<WeightLog | null>(null)

  const form = useForm<LogFormValues>({
    resolver: zodResolver(logSchema),
    defaultValues: { lbs: 0, oz: 0, recordedAt: toLocalDateValue(new Date()), notes: '' },
  })

  const editForm = useForm<LogFormValues>({ resolver: zodResolver(logSchema) })

  const handleOpenForm = () => {
    form.reset({ lbs: 0, oz: 0, recordedAt: toLocalDateValue(new Date()), notes: '' })
    setShowForm(true)
  }

  const handleSubmit = form.handleSubmit((values) => {
    const recordedAt = values.recordedAt
      ? new Date(values.recordedAt + 'T12:00:00').toISOString()
      : undefined
    logMutation.mutate(
      { lbs: values.lbs, oz: values.oz, recordedAt, notes: values.notes?.trim() || undefined },
      { onSuccess: () => { setShowForm(false); form.reset() } },
    )
  })

  const handleStartEdit = (log: WeightLog) => {
    setEditingLog(log)
    editForm.reset({
      lbs: log.lbs,
      oz: log.oz,
      recordedAt: toLocalDateValue(new Date(log.recordedAt)),
      notes: log.notes ?? '',
    })
  }

  const handleSaveEdit = editForm.handleSubmit((values) => {
    if (!editingLog) return
    editMutation.mutate(
      {
        id: editingLog.id,
        lbs: values.lbs,
        oz: values.oz,
        recordedAt: values.recordedAt
          ? new Date(values.recordedAt + 'T12:00:00').toISOString()
          : undefined,
        notes: values.notes?.trim() || null,
      },
      { onSuccess: () => setEditingLog(null) },
    )
  })

  const birthDate: Date | null = birthDateStr ? new Date(birthDateStr) : null

  const latestLog = logs[0]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Weight</h1>
          {latestLog && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Last: {formatWeight(latestLog)} · {formatDate(latestLog.recordedAt)}
            </p>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="max-w-lg mx-auto px-4 py-4">
          <WeightSkeleton />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 md:max-w-5xl md:px-6">

          {/* Latest weight summary */}
          {latestLog && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4">
              <span className="text-3xl">⚖️</span>
              <div className="flex-1">
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                  {formatWeight(latestLog)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Last recorded · {formatDate(latestLog.recordedAt)}
                </p>
              </div>
              {logs.length >= 2 && (() => {
                const prev = logs[1]
                const delta = totalLbs(latestLog) - totalLbs(prev)
                const sign = delta >= 0 ? '+' : ''
                return (
                  <div className={`text-right ${delta >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                    <p className="text-sm font-semibold tabular-nums">
                      {sign}{delta.toFixed(2)} lb
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">since last</p>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Log button / form */}
          {!showForm ? (
            <button
              type="button"
              onClick={handleOpenForm}
              className="w-full py-4 rounded-2xl bg-blue-500 text-white text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              + Log Weight
            </button>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Log weight
              </p>

              {/* lb / oz row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Pounds <span className="text-red-400">*</span>
                  </label>
                  <input
                    {...form.register('lbs', { valueAsNumber: true })}
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    placeholder="0"
                    className={`${inputCls} ${form.formState.errors.lbs ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                  />
                  {form.formState.errors.lbs && (
                    <p className="text-xs text-red-500 mt-1 text-right">
                      {form.formState.errors.lbs.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    Ounces <span className="text-red-400">*</span>
                  </label>
                  <input
                    {...form.register('oz', { valueAsNumber: true })}
                    type="number"
                    min={0}
                    max={15.9}
                    step={0.1}
                    placeholder="0"
                    className={`${inputCls} ${form.formState.errors.oz ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                  />
                  {form.formState.errors.oz && (
                    <p className="text-xs text-red-500 mt-1 text-right">
                      {form.formState.errors.oz.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Date</label>
                <input
                  {...form.register('recordedAt')}
                  type="date"
                  className={inputCls}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                  Notes <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  {...form.register('notes')}
                  placeholder="e.g. At pediatrician's office"
                  className={`${inputCls} ${form.formState.errors.notes ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                />
                {form.formState.errors.notes && (
                  <p className="text-xs text-red-500 mt-1 text-right">
                    {form.formState.errors.notes.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={logMutation.isPending}
                  className="flex-1 py-3.5 rounded-xl bg-blue-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {logMutation.isPending ? 'Logging…' : 'Log Weight'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Growth chart */}
          {logs.length >= 2 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Growth chart
                </p>
                {!birthDate && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                    WHO curves shown after birth is recorded
                  </span>
                )}
              </div>

              {birthDate ? (
                <GrowthChart logs={logs} birthDate={birthDate} />
              ) : (
                <SimpleWeightChart logs={logs} />
              )}
            </div>
          )}

          {/* Log list */}
          {logs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  All measurements
                </p>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {logs.map((log) => {
                  if (editingLog?.id === log.id) {
                    return (
                      <div key={log.id} className="px-4 py-3 space-y-3">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Edit measurement
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Pounds</label>
                            <input
                              {...editForm.register('lbs', { valueAsNumber: true })}
                              type="number" min={0} max={50} step={1}
                              className={`${inputCls} ${editForm.formState.errors.lbs ? 'border-red-400' : ''}`}
                            />
                            {editForm.formState.errors.lbs && (
                              <p className="text-xs text-red-500 mt-1 text-right">{editForm.formState.errors.lbs.message}</p>
                            )}
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Ounces</label>
                            <input
                              {...editForm.register('oz', { valueAsNumber: true })}
                              type="number" min={0} max={15.9} step={0.1}
                              className={`${inputCls} ${editForm.formState.errors.oz ? 'border-red-400' : ''}`}
                            />
                            {editForm.formState.errors.oz && (
                              <p className="text-xs text-red-500 mt-1 text-right">{editForm.formState.errors.oz.message}</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Date</label>
                          <input {...editForm.register('recordedAt')} type="date" className={inputCls} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Notes</label>
                          <input {...editForm.register('notes')} className={inputCls} />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={editMutation.isPending}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                          >
                            {editMutation.isPending ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingLog(null)}
                            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-base flex-shrink-0">
                        ⚖️
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                          {formatWeight(log)}
                        </p>
                        {log.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{log.notes}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                        {formatDate(log.recordedAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(log)}
                        className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-blue-400 dark:hover:text-blue-500 transition-colors flex-shrink-0"
                        aria-label="Edit weight log"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(log.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 -mr-1 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 disabled:opacity-40 transition-colors flex-shrink-0"
                        aria-label="Delete weight log"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {logs.length === 0 && !showForm && (
            <div className="text-center py-12">
              <p className="text-3xl mb-2">⚖️</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">No weight logs yet</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                Tap "Log Weight" to record the first measurement
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Merged chart: WHO reference curves + baby weight share one data array so the
// tooltip fires once per x-position and shows all four values together.
// WHO values are interpolated at every actual measurement day, so hovering an
// orange dot always shows the baby's weight alongside the percentile context.
// connectNulls on the weight line bridges WHO-only monthly rows.
function GrowthChart({ logs, birthDate }: { logs: WeightLog[]; birthDate: Date }) {
  const data = buildChartData(logs, birthDate)
  const maxAgeDays = Math.max(183, ...data.map((d) => d.ageDays))
  const domainMax = Math.ceil(maxAgeDays / 7)

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
        <XAxis
          dataKey="ageDays"
          type="number"
          domain={[0, domainMax * 7]}
          tickCount={7}
          tickFormatter={(v) => `W${Math.round(v / 7)}`}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          unit=" lb"
          width={48}
        />
        <Tooltip content={<ChartTooltip />} cursor={false} />
        <Legend iconType="line" iconSize={12} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
        <Line
          name="3rd %ile"
          type="monotone"
          dataKey="p3"
          stroke="#93c5fd"
          strokeWidth={1}
          strokeDasharray="4 3"
          dot={false}
          activeDot={false}
          connectNulls
          legendType="line"
        />
        <Line
          name="50th %ile"
          type="monotone"
          dataKey="p50"
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeDasharray="6 3"
          dot={false}
          activeDot={false}
          connectNulls
        />
        <Line
          name="97th %ile"
          type="monotone"
          dataKey="p97"
          stroke="#93c5fd"
          strokeWidth={1}
          strokeDasharray="4 3"
          dot={false}
          activeDot={false}
          connectNulls
          legendType="line"
        />
        <Line
          name="Baby weight"
          type="monotone"
          dataKey="weight"
          stroke="#f97316"
          strokeWidth={2.5}
          dot={{ fill: '#f97316', r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// Simple chart when birth date isn't known — just plots weight over time by date
function SimpleWeightChart({ logs }: { logs: WeightLog[] }) {
  const sorted = [...logs].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  )
  const data = sorted.map((log) => ({
    date: new Date(log.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: Math.round(totalLbs(log) * 100) / 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          unit=" lb"
          width={48}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--bg2, #fff)',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(v) => [`${v} lb`, 'Weight']}
        />
        <Line
          name="Weight"
          type="monotone"
          dataKey="weight"
          stroke="#f97316"
          strokeWidth={2.5}
          dot={{ fill: '#f97316', r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
