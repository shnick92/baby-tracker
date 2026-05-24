import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useAuthStore } from '@stores/authStore'
import { formatDuration, formatTimeAgo, formatOz, toDatetimeLocal } from '@lib/utils'
import { useElapsedSeconds } from '@hooks/useElapsedSeconds'
import { TrashIcon, PencilIcon } from '@components/icons'

import { useFeedingLogs } from './useFeedingLogs'
import { FeedingSkeleton } from './FeedingSkeleton'

type Tab = 'BREAST' | 'BOTTLE' | 'PUMP'

const bottleSchema = z.object({
  volumeOz: z.coerce.number().min(0.1, 'Min 0.1 oz').max(16, 'Max 16 oz'),
  milkType: z.enum(['BREAST_MILK', 'FORMULA']).default('BREAST_MILK'),
  formulaName: z.string().max(100, 'Max 100 characters').optional(),
})
const pumpSchema = z.object({
  volumeOz: z.coerce.number().min(0, 'Min 0 oz').max(32, 'Max 32 oz'),
  durationMin: z.coerce.number().min(0, 'Min 0').optional(),
})
const editFeedingSchema = z.object({
  type: z.enum(['BREAST_LEFT', 'BREAST_RIGHT', 'BOTTLE', 'PUMP']),
  startedAt: z.string().min(1, 'Required'),
  endedAt: z.string().optional(),
  volumeOz: z.coerce.number().min(0, 'Min 0 oz').max(32, 'Max 32 oz').optional(),
  notes: z.string().optional(),
})

type BottleForm = z.infer<typeof bottleSchema>
type MilkType = 'BREAST_MILK' | 'FORMULA'
type PumpForm = z.infer<typeof pumpSchema>
type EditFeedingForm = z.infer<typeof editFeedingSchema>

const FEEDING_TYPE_LABEL: Record<string, string> = {
  BREAST_LEFT: 'Left',
  BREAST_RIGHT: 'Right',
  BOTTLE: 'Bottle',
  PUMP: 'Pump',
}

const inputCls =
  'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function FeedDot({ type }: { type: string }) {
  if (type === 'BOTTLE' || type === 'PUMP') {
    return (
      <div className="w-8 h-8 rounded-full bg-emerald-900/30 dark:bg-emerald-900/40 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0">
        {type === 'BOTTLE' ? 'B' : 'P'}
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-blue-900/30 dark:bg-blue-900/40 flex items-center justify-center text-xs font-bold text-blue-400 flex-shrink-0">
      {type === 'BREAST_LEFT' ? 'L' : 'R'}
    </div>
  )
}

export function FeedingPage() {
  const { babyId } = useAuthStore()
  const {
    logs, isLoading, activeSession, feedCountToday, knownFormulaNames,
    startMutation, endMutation, logBottleMutation, logPumpMutation, editMutation, deleteMutation,
  } = useFeedingLogs(babyId!)

  const [activeTab, setActiveTab] = useState<Tab>('BREAST')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formulaSuggestions, setFormulaSuggestions] = useState<string[]>([])
  const formulaInputRef = useRef<HTMLInputElement | null>(null)

  const bottleForm = useForm<BottleForm>({ resolver: zodResolver(bottleSchema), defaultValues: { milkType: 'BREAST_MILK' } })
  const pumpForm = useForm<PumpForm>({ resolver: zodResolver(pumpSchema) })
  const editForm = useForm<EditFeedingForm>({ resolver: zodResolver(editFeedingSchema) })

  const elapsed = useElapsedSeconds(activeSession?.startedAt)

  const completedLogs = logs.filter((l) => l.endedAt || l.type === 'BOTTLE' || l.type === 'PUMP')
  const lastFed = completedLogs[0]

  const lastLeftFeed = logs.find((l) => l.type === 'BREAST_LEFT' && l.endedAt)
  const lastRightFeed = logs.find((l) => l.type === 'BREAST_RIGHT' && l.endedAt)
  const suggestRight =
    lastLeftFeed && lastRightFeed
      ? new Date(lastLeftFeed.endedAt!).getTime() > new Date(lastRightFeed.endedAt!).getTime()
      : lastLeftFeed
        ? true
        : false

  const handleTabChange = (tab: Tab) => {
    if (tab !== 'BOTTLE') bottleForm.reset({ milkType: 'BREAST_MILK' })
    if (tab !== 'PUMP') pumpForm.reset()
    setFormulaSuggestions([])
    setActiveTab(tab)
  }

  const handleFormulaFocus = () => {
    setFormulaSuggestions(knownFormulaNames)
  }

  const handleFormulaInput = (value: string) => {
    if (!value.trim()) { setFormulaSuggestions(knownFormulaNames); return }
    const lower = value.toLowerCase()
    setFormulaSuggestions(knownFormulaNames.filter((n) => n.toLowerCase().includes(lower)))
  }

  const handleFormulaSuggestionPick = (name: string) => {
    bottleForm.setValue('formulaName', name, { shouldValidate: true })
    setFormulaSuggestions([])
    formulaInputRef.current?.blur()
  }

  const handleBreastTap = (side: 'BREAST_LEFT' | 'BREAST_RIGHT') => {
    if (activeSession) {
      endMutation.mutate(activeSession.id)
    } else {
      startMutation.mutate(side)
    }
  }

  const watchedMilkType = bottleForm.watch('milkType') as MilkType

  const onBottleSubmit = bottleForm.handleSubmit((values) => {
    logBottleMutation.mutate({
      volumeOz: values.volumeOz,
      milkType: values.milkType,
      formulaName: values.milkType === 'FORMULA' ? (values.formulaName || undefined) : undefined,
    })
    bottleForm.reset({ milkType: 'BREAST_MILK' })
    setFormulaSuggestions([])
  })

  const onPumpSubmit = pumpForm.handleSubmit((values) => {
    logPumpMutation.mutate({
      volumeOz: values.volumeOz,
      durationSec: values.durationMin ? values.durationMin * 60 : undefined,
    })
    pumpForm.reset()
  })

  const handleStartEdit = (log: (typeof completedLogs)[0]) => {
    setEditingId(log.id)
    editForm.reset({
      type: log.type,
      startedAt: toDatetimeLocal(log.startedAt),
      endedAt: log.endedAt ? toDatetimeLocal(log.endedAt) : '',
      volumeOz: log.volumeOz ?? undefined,
      notes: log.notes ?? '',
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    editForm.reset()
  }

  const onEditSubmit = editForm.handleSubmit((values) => {
    if (!editingId) return
    editMutation.mutate(
      {
        id: editingId,
        type: values.type,
        startedAt: new Date(values.startedAt).toISOString(),
        endedAt: values.endedAt ? new Date(values.endedAt).toISOString() : undefined,
        volumeOz: values.volumeOz ?? null,
        notes: values.notes || null,
      },
      { onSuccess: () => { setEditingId(null); editForm.reset() } },
    )
  })

  const watchedType = editForm.watch('type')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Feeding</h1>
          {feedCountToday > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">Today · {feedCountToday} feeds so far</p>
          )}
        </div>
        {lastFed && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Last {formatTimeAgo(lastFed.endedAt ?? lastFed.startedAt)}
          </span>
        )}
      </header>

      {isLoading ? (
        <div className="max-w-lg mx-auto px-4 py-4">
          <FeedingSkeleton />
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-4 md:max-w-5xl md:px-6 md:grid md:grid-cols-2 md:gap-6 md:items-start">

          {/* Left column: action controls */}
          <div className="space-y-4 md:sticky md:top-4 md:self-start">

            {/* Tab selector */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
              {(['BREAST', 'BOTTLE', 'PUMP'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {tab === 'BREAST' ? 'Breastfeed' : tab === 'BOTTLE' ? 'Bottle' : 'Pumping'}
                </button>
              ))}
            </div>

            {/* Breastfeed tab */}
            {activeTab === 'BREAST' && (
              <>
                {/* Active timer */}
                {activeSession && (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-6 text-center">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                      Session in progress
                    </p>
                    <p className="text-[52px] font-thin tabular-nums text-gray-900 dark:text-gray-100 leading-none">
                      {formatDuration(elapsed)}
                    </p>
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">
                      {FEEDING_TYPE_LABEL[activeSession.type]} side · started{' '}
                      {new Date(activeSession.startedAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        onClick={() => deleteMutation.mutate(activeSession.id)}
                        disabled={endMutation.isPending || deleteMutation.isPending}
                        className="py-3.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold disabled:opacity-40"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => endMutation.mutate(activeSession.id)}
                        disabled={endMutation.isPending || deleteMutation.isPending}
                        className="py-3.5 rounded-xl bg-rose-500 text-white text-sm font-semibold disabled:opacity-50"
                      >
                        Stop
                      </button>
                    </div>
                  </div>
                )}

                {/* Side selector */}
                {!activeSession && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Side</p>
                      {(lastLeftFeed || lastRightFeed) && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">
                          Last: {lastLeftFeed && lastRightFeed
                            ? (new Date(lastLeftFeed.endedAt!).getTime() > new Date(lastRightFeed.endedAt!).getTime() ? 'Left' : 'Right')
                            : lastLeftFeed ? 'Left' : 'Right'}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(['BREAST_LEFT', 'BREAST_RIGHT'] as const).map((side) => {
                        const isLeft = side === 'BREAST_LEFT'
                        const suggest = isLeft ? !suggestRight : suggestRight
                        const lastFeedForSide = isLeft ? lastLeftFeed : lastRightFeed
                        return (
                          <button
                            key={side}
                            onClick={() => handleBreastTap(side)}
                            disabled={startMutation.isPending}
                            className={`flex flex-col items-center gap-1.5 py-4 px-3 rounded-xl border-[1.5px] transition-all active:scale-[0.97] disabled:opacity-40 ${
                              suggest
                                ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            <span className="text-2xl">{isLeft ? '⬅️' : '➡️'}</span>
                            <span className="text-sm font-semibold">{isLeft ? 'Left' : 'Right'}</span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 text-center leading-tight">
                              {suggest
                                ? 'Suggested next'
                                : lastFeedForSide
                                  ? formatTimeAgo(lastFeedForSide.endedAt!)
                                  : 'Not yet today'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Bottle tab */}
            {activeTab === 'BOTTLE' && (
              <form
                noValidate
                onSubmit={onBottleSubmit}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Bottle feed
                </p>

                {/* Milk type radio */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Milk type</label>
                  <div className="flex gap-2">
                    {(['BREAST_MILK', 'FORMULA'] as const).map((type) => (
                      <label
                        key={type}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-[1.5px] text-sm font-medium cursor-pointer transition-colors ${
                          watchedMilkType === type
                            ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          value={type}
                          {...bottleForm.register('milkType')}
                          className="sr-only"
                        />
                        {type === 'BREAST_MILK' ? 'Breast Milk' : 'Formula'}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Formula name autocomplete — shown only when Formula selected */}
                {watchedMilkType === 'FORMULA' && (
                  <div className="relative">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Formula name</label>
                    {(() => {
                      const { ref, onChange, onBlur, ...rest } = bottleForm.register('formulaName')
                      return (
                        <input
                          type="text"
                          placeholder="e.g. Similac"
                          autoComplete="off"
                          ref={(el) => { ref(el); formulaInputRef.current = el }}
                          onChange={(e) => { onChange(e); handleFormulaInput(e.target.value) }}
                          onFocus={handleFormulaFocus}
                          onBlur={(e) => { onBlur(e); setTimeout(() => setFormulaSuggestions([]), 150) }}
                          {...rest}
                          className={`${inputCls} ${bottleForm.formState.errors.formulaName ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                        />
                      )
                    })()}
                    {formulaSuggestions.length > 0 && (
                      <ul className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
                        {formulaSuggestions.map((name) => (
                          <li key={name}>
                            <button
                              type="button"
                              onMouseDown={() => handleFormulaSuggestionPick(name)}
                              className="w-full text-left px-3 py-2.5 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            >
                              {name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {bottleForm.formState.errors.formulaName && (
                      <p className="text-xs text-red-500 mt-1 text-right">{bottleForm.formState.errors.formulaName.message}</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Amount</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      max="16"
                      placeholder="0.0"
                      autoFocus
                      {...bottleForm.register('volumeOz')}
                      className={`${inputCls} ${bottleForm.formState.errors.volumeOz ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 font-medium">oz</span>
                  </div>
                  {bottleForm.formState.errors.volumeOz && (
                    <p className="text-xs text-red-500 mt-1 text-right">{bottleForm.formState.errors.volumeOz.message}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={logBottleMutation.isPending}
                  className="w-full py-3.5 rounded-xl bg-blue-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {logBottleMutation.isPending ? 'Logging…' : 'Log Bottle Feed'}
                </button>
              </form>
            )}

            {/* Pump tab */}
            {activeTab === 'PUMP' && (
              <form
                noValidate
                onSubmit={onPumpSubmit}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Pumping session
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Volume</label>
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="32"
                        placeholder="0.0"
                        autoFocus
                        {...pumpForm.register('volumeOz')}
                        className={`${inputCls} ${pumpForm.formState.errors.volumeOz ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                      />
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">oz</span>
                    </div>
                    {pumpForm.formState.errors.volumeOz && (
                      <p className="text-xs text-red-500 mt-1 text-right">{pumpForm.formState.errors.volumeOz.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">Duration</label>
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="0"
                        {...pumpForm.register('durationMin')}
                        className={`${inputCls} ${pumpForm.formState.errors.durationMin ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                      />
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">min</span>
                    </div>
                    {pumpForm.formState.errors.durationMin && (
                      <p className="text-xs text-red-500 mt-1 text-right">{pumpForm.formState.errors.durationMin.message}</p>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={logPumpMutation.isPending}
                  className="w-full py-3.5 rounded-xl bg-blue-500 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {logPumpMutation.isPending ? 'Logging…' : 'Log Pump Session'}
                </button>
              </form>
            )}
          </div>

          {/* Right column: log history */}
          <div className="mt-4 md:mt-0">
            {completedLogs.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Last {Math.min(completedLogs.length, 8)} feeds
                  </p>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {completedLogs.slice(0, 8).map((log) =>
                    editingId === log.id ? (
                      <form
                        key={log.id}
                        noValidate
                        onSubmit={onEditSubmit}
                        className="px-4 py-3 space-y-3"
                      >
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Edit feeding
                        </p>

                        <select {...editForm.register('type')} className={inputCls}>
                          <option value="BREAST_LEFT">Left breast</option>
                          <option value="BREAST_RIGHT">Right breast</option>
                          <option value="BOTTLE">Bottle</option>
                          <option value="PUMP">Pump</option>
                        </select>

                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start</label>
                          <input
                            type="datetime-local"
                            {...editForm.register('startedAt')}
                            className={`${inputCls} ${editForm.formState.errors.startedAt ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                          />
                          {editForm.formState.errors.startedAt && (
                            <p className="text-xs text-red-500 mt-1 text-right">{editForm.formState.errors.startedAt.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End</label>
                          <input type="datetime-local" {...editForm.register('endedAt')} className={inputCls} />
                        </div>

                        {(watchedType === 'BOTTLE' || watchedType === 'PUMP') && (
                          <div>
                            <div className="flex gap-2 items-center">
                              <input
                                type="number" step="0.5" min="0" max="32" placeholder="oz"
                                {...editForm.register('volumeOz')}
                                className={`${inputCls} ${editForm.formState.errors.volumeOz ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                              />
                              <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">oz</span>
                            </div>
                            {editForm.formState.errors.volumeOz && (
                              <p className="text-xs text-red-500 mt-1 text-right">{editForm.formState.errors.volumeOz.message}</p>
                            )}
                          </div>
                        )}

                        <input
                          type="text" placeholder="Notes (optional)"
                          {...editForm.register('notes')}
                          className={inputCls}
                        />

                        <div className="flex gap-2 pt-1">
                          <button
                            type="submit"
                            disabled={editMutation.isPending}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                          >
                            {editMutation.isPending ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                        <FeedDot type={log.type} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                            {log.type === 'BREAST_LEFT' || log.type === 'BREAST_RIGHT'
                              ? `Breastfeed · ${FEEDING_TYPE_LABEL[log.type]}`
                              : log.type === 'BOTTLE'
                                ? (log.formulaName || (log.milkType === 'FORMULA' ? 'Formula' : 'Breast Milk'))
                                : FEEDING_TYPE_LABEL[log.type]}
                            {log.volumeOz != null && (
                              <span className="text-gray-500 dark:text-gray-400 font-normal">
                                {' · '}{formatOz(log.volumeOz)}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {log.durationSec != null
                              ? `${formatDuration(log.durationSec)}`
                              : ''}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5">
                          {new Date(log.endedAt ?? log.startedAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(log)}
                          className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-blue-400 dark:hover:text-blue-500 transition-colors flex-shrink-0"
                          aria-label={`Edit ${FEEDING_TYPE_LABEL[log.type]} log`}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(log.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 -mr-1 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 disabled:opacity-40 transition-colors flex-shrink-0"
                          aria-label={`Delete ${FEEDING_TYPE_LABEL[log.type]} log`}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
