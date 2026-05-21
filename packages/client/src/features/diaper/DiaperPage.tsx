import { useState } from 'react'

import { useAuthStore } from '@stores/authStore'
import { TrashIcon, PencilIcon } from '@components/icons'
import type { DiaperColor, DiaperConsistency, DiaperType } from '@tracker/shared'

import { useDiaperLogs } from './useDiaperLogs'
import { DiaperSkeleton } from './DiaperSkeleton'

const COLOR_OPTIONS: { value: DiaperColor; label: string; bg: string; ring: string }[] = [
  { value: 'YELLOW', label: 'Yellow', bg: 'bg-yellow-400', ring: 'ring-yellow-400' },
  { value: 'GREEN', label: 'Green', bg: 'bg-green-500', ring: 'ring-green-500' },
  { value: 'BROWN', label: 'Brown', bg: 'bg-amber-700', ring: 'ring-amber-700' },
  { value: 'BLACK', label: 'Black', bg: 'bg-gray-800', ring: 'ring-gray-600' },
  { value: 'RED', label: 'Red', bg: 'bg-red-500', ring: 'ring-red-500' },
  { value: 'OTHER', label: 'Other', bg: 'bg-gray-400', ring: 'ring-gray-400' },
]

const CONSISTENCY_OPTIONS: { value: DiaperConsistency; label: string }[] = [
  { value: 'SEEDY', label: 'Seedy' },
  { value: 'PASTY', label: 'Soft' },
  { value: 'FIRM', label: 'Firm' },
  { value: 'RUNNY', label: 'Runny' },
  { value: 'WATERY', label: 'Watery' },
  { value: 'CUSTOM', label: 'Other' },
]

const TYPE_LABEL: Record<DiaperType, string> = { WET: 'Wet', DIRTY: 'Dirty', BOTH: 'Wet + Dirty' }

export function DiaperPage() {
  const { babyId } = useAuthStore()
  const { logs, isLoading, wetCount, dirtyCount, logMutation, editMutation, deleteMutation } =
    useDiaperLogs(babyId!)

  const [pendingType, setPendingType] = useState<DiaperType | null>(null)
  const [selectedColor, setSelectedColor] = useState<DiaperColor | null>(null)
  const [selectedConsistency, setSelectedConsistency] = useState<DiaperConsistency | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editType, setEditType] = useState<DiaperType>('WET')
  const [editColor, setEditColor] = useState<DiaperColor | null>(null)
  const [editConsistency, setEditConsistency] = useState<DiaperConsistency | null>(null)

  const needsDetail = pendingType === 'DIRTY' || pendingType === 'BOTH'
  const editNeedsDetail = editType === 'DIRTY' || editType === 'BOTH'

  const totalToday = wetCount + dirtyCount

  const handleTypeSelect = (type: DiaperType) => {
    if (type === 'WET') {
      logMutation.mutate({ type }, { onSuccess: () => setPendingType(null) })
    } else {
      setPendingType((prev) => (prev === type ? null : type))
      setSelectedColor(null)
      setSelectedConsistency(null)
    }
  }

  const handleLog = () => {
    if (!pendingType) return
    logMutation.mutate(
      {
        type: pendingType,
        color: selectedColor ?? undefined,
        consistency: selectedConsistency ?? undefined,
      },
      {
        onSuccess: () => {
          setPendingType(null)
          setSelectedColor(null)
          setSelectedConsistency(null)
        },
      },
    )
  }

  const handleStartEdit = (log: (typeof logs)[0]) => {
    setEditingId(log.id)
    setEditType(log.type)
    setEditColor(log.color)
    setEditConsistency(log.consistency)
  }

  const handleCancelEdit = () => setEditingId(null)

  const handleSaveEdit = () => {
    if (!editingId) return
    editMutation.mutate(
      {
        id: editingId,
        type: editType,
        color: editNeedsDetail ? editColor : null,
        consistency: editNeedsDetail ? editConsistency : null,
        customConsistency: null,
      },
      { onSuccess: () => setEditingId(null) },
    )
  }

  const dotBg = (type: DiaperType) =>
    type === 'WET'
      ? 'bg-blue-100 dark:bg-blue-900/30'
      : 'bg-amber-100 dark:bg-amber-900/30'
  const dotEmoji = (type: DiaperType) =>
    type === 'WET' ? '💧' : type === 'DIRTY' ? '🟡' : '💧🟡'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Diapers</h1>
          {totalToday > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">Today · {totalToday} changes</p>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="max-w-lg mx-auto px-4 py-4">
          <DiaperSkeleton />
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-4 md:max-w-5xl md:px-6 md:grid md:grid-cols-2 md:gap-6 md:items-start">

          {/* Left column: quick-log */}
          <div className="space-y-4">

            {/* Count strip */}
            {totalToday > 0 && (
              <div className="flex gap-2">
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 py-2.5 text-center">
                  <p className="text-xl font-semibold text-blue-500 dark:text-blue-400 tabular-nums leading-none">{wetCount}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mt-1">Wet</p>
                </div>
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 py-2.5 text-center">
                  <p className="text-xl font-semibold text-amber-500 dark:text-amber-400 tabular-nums leading-none">{dirtyCount}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mt-1">Dirty</p>
                </div>
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 py-2.5 text-center">
                  <p className="text-xl font-semibold text-gray-600 dark:text-gray-300 tabular-nums leading-none">{totalToday}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 mt-1">Total</p>
                </div>
              </div>
            )}

            {/* Section label */}
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-0.5">
              Log a diaper change
            </p>

            {/* Diaper type buttons — Wet / Dirty */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleTypeSelect('WET')}
                disabled={logMutation.isPending}
                className={`flex flex-col items-center gap-2 py-5 px-3 rounded-2xl border-[1.5px] transition-all active:scale-[0.97] disabled:opacity-40 ${
                  pendingType === 'WET'
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10'
                }`}
              >
                <span className="text-3xl">💧</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Wet</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 text-center">Log immediately</span>
              </button>

              <button
                onClick={() => handleTypeSelect('DIRTY')}
                disabled={logMutation.isPending}
                className={`flex flex-col items-center gap-2 py-5 px-3 rounded-2xl border-[1.5px] transition-all active:scale-[0.97] disabled:opacity-40 ${
                  pendingType === 'DIRTY'
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10'
                }`}
              >
                <span className="text-3xl">🟡</span>
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Dirty</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 text-center">More options below</span>
              </button>
            </div>

            {/* Wet + Dirty option */}
            <button
              onClick={() => handleTypeSelect('BOTH')}
              disabled={logMutation.isPending}
              className={`w-full py-3 rounded-xl border-[1.5px] text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-40 ${
                pendingType === 'BOTH'
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              💧🟡 Wet + Dirty
            </button>

            {/* Dirty detail card */}
            {pendingType && needsDetail && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {pendingType === 'DIRTY' ? 'Dirty diaper details' : 'Diaper details'}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium">Optional</span>
                </div>

                {/* Color — circular chips */}
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Color</p>
                  <div className="flex gap-3 flex-wrap">
                    {COLOR_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSelectedColor(selectedColor === opt.value ? null : opt.value)}
                        title={opt.label}
                        className={`w-8 h-8 rounded-full ${opt.bg} transition-all ${
                          selectedColor === opt.value
                            ? `ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ${opt.ring} scale-110`
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                  {selectedColor === 'RED' && (
                    <p className="text-[10px] text-red-500 mt-1.5">Red = contact doctor immediately</p>
                  )}
                </div>

                {/* Consistency — toggle tabs */}
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Consistency</p>
                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 gap-0.5 flex-wrap">
                    {CONSISTENCY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setSelectedConsistency(
                            selectedConsistency === opt.value ? null : opt.value,
                          )
                        }
                        className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors min-w-[3.5rem] ${
                          selectedConsistency === opt.value
                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleLog}
                    disabled={logMutation.isPending}
                    className="flex-1 py-3.5 rounded-xl bg-blue-500 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {logMutation.isPending
                      ? 'Logging…'
                      : pendingType === 'DIRTY'
                        ? 'Log Dirty Diaper'
                        : 'Log Diaper'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingType(null)
                      setSelectedColor(null)
                      setSelectedConsistency(null)
                    }}
                    className="px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right column: log list */}
          <div className="mt-4 md:mt-0">
            {logs.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Today's changes
                  </p>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {logs.slice(0, 10).map((log) => {
                    if (editingId === log.id) {
                      return (
                        <div key={log.id} className="px-4 py-3 space-y-3">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Edit diaper
                          </p>

                          {/* Type selector */}
                          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 gap-0.5">
                            {(['WET', 'DIRTY', 'BOTH'] as const).map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setEditType(type)}
                                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                  editType === type
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}
                              >
                                {TYPE_LABEL[type]}
                              </button>
                            ))}
                          </div>

                          {editNeedsDetail && (
                            <>
                              <div>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Color</p>
                                <div className="flex gap-3 flex-wrap">
                                  {COLOR_OPTIONS.map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => setEditColor(editColor === opt.value ? null : opt.value)}
                                      title={opt.label}
                                      className={`w-8 h-8 rounded-full ${opt.bg} transition-all ${
                                        editColor === opt.value
                                          ? `ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ${opt.ring} scale-110`
                                          : 'opacity-70 hover:opacity-100'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Consistency</p>
                                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 gap-0.5 flex-wrap">
                                  {CONSISTENCY_OPTIONS.map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() =>
                                        setEditConsistency(
                                          editConsistency === opt.value ? null : opt.value,
                                        )
                                      }
                                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors min-w-[3.5rem] ${
                                        editConsistency === opt.value
                                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                                          : 'text-gray-500 dark:text-gray-400'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}

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
                              onClick={handleCancelEdit}
                              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                        <div className={`w-8 h-8 rounded-full ${dotBg(log.type)} flex items-center justify-center text-base flex-shrink-0`}>
                          {dotEmoji(log.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                            {TYPE_LABEL[log.type]}
                            {log.color && (
                              <span className="text-gray-500 dark:text-gray-400 font-normal">
                                {' · '}{log.color.charAt(0) + log.color.slice(1).toLowerCase()}
                                {log.consistency && `, ${log.consistency.toLowerCase()}`}
                              </span>
                            )}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5">
                          {new Date(log.occurredAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(log)}
                          className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-blue-400 dark:hover:text-blue-500 transition-colors flex-shrink-0"
                          aria-label={`Edit ${TYPE_LABEL[log.type]} diaper log`}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(log.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 -mr-1 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 disabled:opacity-40 transition-colors flex-shrink-0"
                          aria-label={`Delete ${TYPE_LABEL[log.type]} diaper log`}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
