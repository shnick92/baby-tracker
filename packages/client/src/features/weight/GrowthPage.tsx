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
import { useHeightLogs, formatHeight } from './useHeightLogs'
import { WeightSkeleton } from './WeightSkeleton'
import { WHO_DATA, interpolateWho } from './whoData'
import { WHO_HEIGHT_DATA, interpolateWhoHeight } from './whoHeightData'
import type { WeightLog } from './useWeightLogs'
import type { HeightLog } from './useHeightLogs'
import type { UpdateWeightInput, UpdateHeightInput } from '@tracker/shared'

const inputCls =
  'w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500'

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

// ─── Weight tab ───────────────────────────────────────────────────────────────

const weightSchema = z.object({
  lbs: z.number({ invalid_type_error: 'Enter whole pounds' }).int('Whole pounds only').min(0, 'Min 0 lbs').max(50, 'Max 50 lbs'),
  oz: z.number({ invalid_type_error: 'Enter ounces' }).min(0, 'Min 0 oz').max(15.9, 'Max 15.9 oz'),
  recordedAt: z.string().optional(),
  notes: z.string().max(500, 'Max 500 characters').optional(),
})
type WeightFormValues = z.infer<typeof weightSchema>

function buildWeightChartData(logs: WeightLog[], birthDate: Date) {
  const actualMap = new Map<number, number>()
  for (const log of logs) {
    const ageDays = Math.round((new Date(log.recordedAt).getTime() - birthDate.getTime()) / 86_400_000)
    if (ageDays >= 0 && ageDays <= 200) actualMap.set(ageDays, Math.round(totalLbs(log) * 100) / 100)
  }
  const allDays = new Set([...WHO_DATA.map((d) => d.ageDays), ...actualMap.keys()])
  return Array.from(allDays).sort((a, b) => a - b).map((ageDays) => {
    const who = interpolateWho(ageDays)
    return { ageDays, p3: who?.p3, p50: who?.p50, p97: who?.p97, value: actualMap.get(ageDays) }
  })
}

function WeightTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: number }) {
  if (!active || !payload?.length || label === undefined) return null
  if (!payload.find((e) => e.name === 'Baby' && e.value != null)) return null
  const weeks = Math.round((label / 7) * 10) / 10
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-gray-600 dark:text-gray-300 mb-1">Week {weeks}</p>
      {payload.filter((e) => e.value != null).map((e) => (
        <p key={e.name} style={{ color: e.color }}>{e.name}: {Number(e.value).toFixed(1)} lb</p>
      ))}
    </div>
  )
}

function WeightTab({ babyId, birthDate }: { babyId: string; birthDate: Date | null }) {
  const { logs, isLoading, logMutation, editMutation, deleteMutation } = useWeightLogs(babyId)
  const [showForm, setShowForm] = useState(false)
  const [editingLog, setEditingLog] = useState<WeightLog | null>(null)
  const form = useForm<WeightFormValues>({ resolver: zodResolver(weightSchema), defaultValues: { lbs: 0, oz: 0, recordedAt: toLocalDateValue(new Date()), notes: '' } })
  const editForm = useForm<WeightFormValues>({ resolver: zodResolver(weightSchema) })

  const handleSubmit = form.handleSubmit((values) => {
    const recordedAt = values.recordedAt ? new Date(values.recordedAt + 'T12:00:00').toISOString() : undefined
    logMutation.mutate({ lbs: values.lbs, oz: values.oz, recordedAt, notes: values.notes?.trim() || undefined }, { onSuccess: () => { setShowForm(false); form.reset() } })
  })

  const handleSaveEdit = editForm.handleSubmit((values) => {
    if (!editingLog) return
    editMutation.mutate({ id: editingLog.id, lbs: values.lbs, oz: values.oz, recordedAt: values.recordedAt ? new Date(values.recordedAt + 'T12:00:00').toISOString() : undefined, notes: values.notes?.trim() || null } as { id: string } & UpdateWeightInput, { onSuccess: () => setEditingLog(null) })
  })

  const latestLog = logs[0]

  if (isLoading) return <div className="px-4 py-4"><WeightSkeleton /></div>

  return (
    <div className="space-y-4 px-4 py-4 md:px-6">
      {latestLog && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4">
          <span className="text-3xl">⚖️</span>
          <div className="flex-1">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{formatWeight(latestLog)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Last recorded · {formatDate(latestLog.recordedAt)}</p>
          </div>
          {logs.length >= 2 && (() => {
            const prev = logs[1]
            const delta = totalLbs(latestLog) - totalLbs(prev)
            const sign = delta >= 0 ? '+' : ''
            return (
              <div className={`text-right ${delta >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                <p className="text-sm font-semibold tabular-nums">{sign}{delta.toFixed(2)} lb</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">since last</p>
              </div>
            )
          })()}
        </div>
      )}

      {!showForm ? (
        <button type="button" onClick={() => { form.reset({ lbs: 0, oz: 0, recordedAt: toLocalDateValue(new Date()), notes: '' }); setShowForm(true) }}
          className="w-full py-4 rounded-2xl bg-blue-500 text-white text-sm font-semibold active:scale-[0.98] transition-transform">
          + Log Weight
        </button>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Log weight</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Pounds <span className="text-red-400">*</span></label>
              <input {...form.register('lbs', { valueAsNumber: true })} type="number" min={0} max={50} step={1} placeholder="0"
                className={`${inputCls} ${form.formState.errors.lbs ? 'border-red-400' : ''}`} />
              {form.formState.errors.lbs && <p className="text-xs text-red-500 mt-1 text-right">{form.formState.errors.lbs.message}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Ounces <span className="text-red-400">*</span></label>
              <input {...form.register('oz', { valueAsNumber: true })} type="number" min={0} max={15.9} step={0.1} placeholder="0"
                className={`${inputCls} ${form.formState.errors.oz ? 'border-red-400' : ''}`} />
              {form.formState.errors.oz && <p className="text-xs text-red-500 mt-1 text-right">{form.formState.errors.oz.message}</p>}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Date</label>
            <input {...form.register('recordedAt')} type="date" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Notes <span className="text-gray-400">(optional)</span></label>
            <input {...form.register('notes')} placeholder="e.g. At pediatrician's office" className={`${inputCls} ${form.formState.errors.notes ? 'border-red-400' : ''}`} />
            {form.formState.errors.notes && <p className="text-xs text-red-500 mt-1 text-right">{form.formState.errors.notes.message}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleSubmit} disabled={logMutation.isPending}
              className="flex-1 py-3.5 rounded-xl bg-blue-500 text-white text-sm font-semibold disabled:opacity-50">
              {logMutation.isPending ? 'Logging…' : 'Log Weight'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">
              Cancel
            </button>
          </div>
        </div>
      )}

      {logs.length >= 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Weight chart</p>
          {birthDate ? (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={buildWeightChartData(logs, birthDate)} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis dataKey="ageDays" type="number" domain={[0, 183]} tickCount={7} tickFormatter={(v) => `W${Math.round(v / 7)}`} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#9ca3af' }} unit=" lb" width={48} />
                <Tooltip content={<WeightTooltip />} cursor={false} />
                <Legend iconType="line" iconSize={12} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                <Line name="3rd %ile" type="monotone" dataKey="p3" stroke="#93c5fd" strokeWidth={1} strokeDasharray="4 3" dot={false} activeDot={false} connectNulls legendType="line" />
                <Line name="50th %ile" type="monotone" dataKey="p50" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="6 3" dot={false} activeDot={false} connectNulls />
                <Line name="97th %ile" type="monotone" dataKey="p97" stroke="#93c5fd" strokeWidth={1} strokeDasharray="4 3" dot={false} activeDot={false} connectNulls legendType="line" />
                <Line name="Baby" type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2.5} dot={{ fill: '#f97316', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">WHO curves shown after birth is recorded</p>
          )}
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">All measurements</p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {logs.map((log) => {
              if (editingLog?.id === log.id) {
                return (
                  <div key={log.id} className="px-4 py-3 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Edit measurement</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Pounds</label>
                        <input {...editForm.register('lbs', { valueAsNumber: true })} type="number" min={0} max={50} step={1}
                          className={`${inputCls} ${editForm.formState.errors.lbs ? 'border-red-400' : ''}`} />
                        {editForm.formState.errors.lbs && <p className="text-xs text-red-500 mt-1 text-right">{editForm.formState.errors.lbs.message}</p>}
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Ounces</label>
                        <input {...editForm.register('oz', { valueAsNumber: true })} type="number" min={0} max={15.9} step={0.1}
                          className={`${inputCls} ${editForm.formState.errors.oz ? 'border-red-400' : ''}`} />
                        {editForm.formState.errors.oz && <p className="text-xs text-red-500 mt-1 text-right">{editForm.formState.errors.oz.message}</p>}
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
                      <button type="button" onClick={handleSaveEdit} disabled={editMutation.isPending}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50">
                        {editMutation.isPending ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" onClick={() => setEditingLog(null)}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              }
              return (
                <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-base flex-shrink-0">⚖️</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{formatWeight(log)}</p>
                    {log.notes && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{log.notes}</p>}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{formatDate(log.recordedAt)}</span>
                  <button type="button" onClick={() => { setEditingLog(log); editForm.reset({ lbs: log.lbs, oz: log.oz, recordedAt: toLocalDateValue(new Date(log.recordedAt)), notes: log.notes ?? '' }) }}
                    className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-blue-400 transition-colors flex-shrink-0" aria-label="Edit">
                    <PencilIcon />
                  </button>
                  <button type="button" onClick={() => deleteMutation.mutate(log.id)} disabled={deleteMutation.isPending}
                    className="p-1.5 -mr-1 text-gray-300 dark:text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors flex-shrink-0" aria-label="Delete">
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
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Tap "Log Weight" to record the first measurement</p>
        </div>
      )}
    </div>
  )
}

// ─── Height tab ───────────────────────────────────────────────────────────────

const heightSchema = z.object({
  inches: z.number({ invalid_type_error: 'Enter a measurement' }).min(10, 'Min 10 inches').max(48, 'Max 48 inches'),
  showCm: z.boolean().optional(),
  recordedAt: z.string().optional(),
  notes: z.string().max(500, 'Max 500 characters').optional(),
})
type HeightFormValues = z.infer<typeof heightSchema>

function buildHeightChartData(logs: HeightLog[], birthDate: Date) {
  const actualMap = new Map<number, number>()
  for (const log of logs) {
    const ageDays = Math.round((new Date(log.recordedAt).getTime() - birthDate.getTime()) / 86_400_000)
    if (ageDays >= 0 && ageDays <= 200) actualMap.set(ageDays, Math.round(log.inches * 10) / 10)
  }
  const allDays = new Set([...WHO_HEIGHT_DATA.map((d) => d.ageDays), ...actualMap.keys()])
  return Array.from(allDays).sort((a, b) => a - b).map((ageDays) => {
    const who = interpolateWhoHeight(ageDays)
    return { ageDays, p3: who?.p3, p50: who?.p50, p97: who?.p97, value: actualMap.get(ageDays) }
  })
}

function HeightTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: number }) {
  if (!active || !payload?.length || label === undefined) return null
  if (!payload.find((e) => e.name === 'Baby' && e.value != null)) return null
  const weeks = Math.round((label / 7) * 10) / 10
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-gray-600 dark:text-gray-300 mb-1">Week {weeks}</p>
      {payload.filter((e) => e.value != null).map((e) => (
        <p key={e.name} style={{ color: e.color }}>{e.name}: {Number(e.value).toFixed(1)} in</p>
      ))}
    </div>
  )
}

function HeightTab({ babyId, birthDate }: { babyId: string; birthDate: Date | null }) {
  const { logs, isLoading, logMutation, editMutation, deleteMutation } = useHeightLogs(babyId)
  const [showForm, setShowForm] = useState(false)
  const [editingLog, setEditingLog] = useState<HeightLog | null>(null)
  const [useCm, setUseCm] = useState(false)

  const form = useForm<HeightFormValues>({ resolver: zodResolver(heightSchema), defaultValues: { inches: undefined, recordedAt: toLocalDateValue(new Date()), notes: '' } })
  const editForm = useForm<HeightFormValues>({ resolver: zodResolver(heightSchema) })

  const handleSubmit = form.handleSubmit((values) => {
    const rawInches = useCm ? values.inches / 2.54 : values.inches
    const recordedAt = values.recordedAt ? new Date(values.recordedAt + 'T12:00:00').toISOString() : undefined
    logMutation.mutate({ inches: Math.round(rawInches * 100) / 100, recordedAt, notes: values.notes?.trim() || undefined }, { onSuccess: () => { setShowForm(false); form.reset() } })
  })

  const handleSaveEdit = editForm.handleSubmit((values) => {
    if (!editingLog) return
    const rawInches = useCm ? values.inches / 2.54 : values.inches
    editMutation.mutate({ id: editingLog.id, inches: Math.round(rawInches * 100) / 100, recordedAt: values.recordedAt ? new Date(values.recordedAt + 'T12:00:00').toISOString() : undefined, notes: values.notes?.trim() || null } as { id: string } & UpdateHeightInput, { onSuccess: () => setEditingLog(null) })
  })

  const latestLog = logs[0]
  const unit = useCm ? 'cm' : 'in'

  if (isLoading) return <div className="px-4 py-4"><WeightSkeleton /></div>

  return (
    <div className="space-y-4 px-4 py-4 md:px-6">
      {latestLog && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4">
          <span className="text-3xl">📏</span>
          <div className="flex-1">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{formatHeight(latestLog.inches, useCm)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Last recorded · {formatDate(latestLog.recordedAt)}</p>
          </div>
          {logs.length >= 2 && (() => {
            const prev = logs[1]
            const delta = latestLog.inches - prev.inches
            const sign = delta >= 0 ? '+' : ''
            const deltaDisplay = useCm ? `${sign}${(delta * 2.54).toFixed(1)} cm` : `${sign}${delta.toFixed(1)} in`
            return (
              <div className={`text-right ${delta >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                <p className="text-sm font-semibold tabular-nums">{deltaDisplay}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">since last</p>
              </div>
            )
          })()}
        </div>
      )}

      {/* Unit toggle */}
      <div className="flex justify-end">
        <button type="button" onClick={() => setUseCm((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Show in {useCm ? 'inches' : 'cm'}
        </button>
      </div>

      {!showForm ? (
        <button type="button" onClick={() => { form.reset({ inches: undefined, recordedAt: toLocalDateValue(new Date()), notes: '' }); setShowForm(true) }}
          className="w-full py-4 rounded-2xl bg-emerald-500 text-white text-sm font-semibold active:scale-[0.98] transition-transform">
          + Log Height
        </button>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Log height</p>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
              Height ({unit}) <span className="text-red-400">*</span>
            </label>
            <input {...form.register('inches', { valueAsNumber: true })} type="number" min={useCm ? 25 : 10} max={useCm ? 122 : 48} step={0.1}
              placeholder={useCm ? '50.0' : '19.5'}
              className={`${inputCls} ${form.formState.errors.inches ? 'border-red-400' : ''}`} />
            {form.formState.errors.inches && <p className="text-xs text-red-500 mt-1 text-right">{form.formState.errors.inches.message}</p>}
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
              Values stored in inches. {useCm ? 'Entered cm converted automatically.' : 'Toggle button above to enter in cm.'}
            </p>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Date</label>
            <input {...form.register('recordedAt')} type="date" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Notes <span className="text-gray-400">(optional)</span></label>
            <input {...form.register('notes')} placeholder="e.g. At 2-month checkup"
              className={`${inputCls} ${form.formState.errors.notes ? 'border-red-400' : ''}`} />
            {form.formState.errors.notes && <p className="text-xs text-red-500 mt-1 text-right">{form.formState.errors.notes.message}</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleSubmit} disabled={logMutation.isPending}
              className="flex-1 py-3.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50">
              {logMutation.isPending ? 'Logging…' : 'Log Height'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">
              Cancel
            </button>
          </div>
        </div>
      )}

      {logs.length >= 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Height chart</p>
          {birthDate ? (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={buildHeightChartData(logs, birthDate)} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis dataKey="ageDays" type="number" domain={[0, 183]} tickCount={7} tickFormatter={(v) => `W${Math.round(v / 7)}`} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#9ca3af' }} unit=" in" width={48} />
                <Tooltip content={<HeightTooltip />} cursor={false} />
                <Legend iconType="line" iconSize={12} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                <Line name="3rd %ile" type="monotone" dataKey="p3" stroke="#6ee7b7" strokeWidth={1} strokeDasharray="4 3" dot={false} activeDot={false} connectNulls legendType="line" />
                <Line name="50th %ile" type="monotone" dataKey="p50" stroke="#10b981" strokeWidth={1.5} strokeDasharray="6 3" dot={false} activeDot={false} connectNulls />
                <Line name="97th %ile" type="monotone" dataKey="p97" stroke="#6ee7b7" strokeWidth={1} strokeDasharray="4 3" dot={false} activeDot={false} connectNulls legendType="line" />
                <Line name="Baby" type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2.5} dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">WHO curves shown after birth is recorded</p>
          )}
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">All measurements</p>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {logs.map((log) => {
              if (editingLog?.id === log.id) {
                const editVal = useCm ? +(log.inches * 2.54).toFixed(1) : log.inches
                return (
                  <div key={log.id} className="px-4 py-3 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Edit measurement</p>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Height ({unit})</label>
                      <input {...editForm.register('inches', { valueAsNumber: true })} type="number" min={useCm ? 25 : 10} max={useCm ? 122 : 48} step={0.1}
                        defaultValue={editVal}
                        className={`${inputCls} ${editForm.formState.errors.inches ? 'border-red-400' : ''}`} />
                      {editForm.formState.errors.inches && <p className="text-xs text-red-500 mt-1 text-right">{editForm.formState.errors.inches.message}</p>}
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
                      <button type="button" onClick={handleSaveEdit} disabled={editMutation.isPending}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium disabled:opacity-50">
                        {editMutation.isPending ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" onClick={() => setEditingLog(null)}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">
                        Cancel
                      </button>
                    </div>
                  </div>
                )
              }
              return (
                <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-base flex-shrink-0">📏</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{formatHeight(log.inches, useCm)}</p>
                    {log.notes && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{log.notes}</p>}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{formatDate(log.recordedAt)}</span>
                  <button type="button" onClick={() => { setEditingLog(log); editForm.reset({ inches: log.inches, recordedAt: toLocalDateValue(new Date(log.recordedAt)), notes: log.notes ?? '' }) }}
                    className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-blue-400 transition-colors flex-shrink-0" aria-label="Edit">
                    <PencilIcon />
                  </button>
                  <button type="button" onClick={() => deleteMutation.mutate(log.id)} disabled={deleteMutation.isPending}
                    className="p-1.5 -mr-1 text-gray-300 dark:text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors flex-shrink-0" aria-label="Delete">
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
          <p className="text-3xl mb-2">📏</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">No height logs yet</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Tap "Log Height" to record the first measurement</p>
        </div>
      )}
    </div>
  )
}

// ─── GrowthPage (tab container) ───────────────────────────────────────────────

type Tab = 'weight' | 'height'

export function GrowthPage() {
  const { babyId, birthDate: birthDateStr } = useAuthStore()
  const [tab, setTab] = useState<Tab>('weight')
  const birthDate: Date | null = birthDateStr ? new Date(birthDateStr) : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Weight & Growth</h1>
      </header>

      {/* Tab strip */}
      <div className="sticky top-[53px] md:top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 flex gap-0">
        {(['weight', 'height'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 ${
              tab === t
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600'
            }`}
          >
            {t === 'weight' ? '⚖️ Weight' : '📏 Height'}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto md:max-w-5xl">
        {tab === 'weight' ? (
          <WeightTab babyId={babyId!} birthDate={birthDate} />
        ) : (
          <HeightTab babyId={babyId!} birthDate={birthDate} />
        )}
      </div>
    </div>
  )
}
