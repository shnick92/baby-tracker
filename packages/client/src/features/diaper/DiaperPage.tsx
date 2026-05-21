import { useState } from 'react'

import { useAuthStore } from '@stores/authStore'
import { formatTimeAgo } from '@lib/utils'
import { TrashIcon, PencilIcon } from '@components/icons'
import type { DiaperColor, DiaperConsistency, DiaperType } from '@tracker/shared'

import { useDiaperLogs } from './useDiaperLogs'
import { DiaperSkeleton } from './DiaperSkeleton'

const COLOR_OPTIONS: { value: DiaperColor; label: string; dot: string }[] = [
  { value: 'YELLOW', label: 'Yellow', dot: 'bg-yellow-400' },
  { value: 'GREEN', label: 'Green', dot: 'bg-green-500' },
  { value: 'BROWN', label: 'Brown', dot: 'bg-amber-700' },
  { value: 'BLACK', label: 'Black', dot: 'bg-gray-900 dark:bg-gray-600' },
  { value: 'RED', label: 'Red', dot: 'bg-red-500' },
  { value: 'OTHER', label: 'Other', dot: 'bg-gray-300 dark:bg-gray-600' },
]

const CONSISTENCY_OPTIONS: { value: DiaperConsistency; label: string }[] = [
  { value: 'SEEDY', label: 'Seedy' },
  { value: 'PASTY', label: 'Pasty' },
  { value: 'RUNNY', label: 'Runny' },
  { value: 'FIRM', label: 'Firm' },
  { value: 'WATERY', label: 'Watery' },
  { value: 'CUSTOM', label: 'Other' },
]

const TYPE_LABEL: Record<DiaperType, string> = { WET: 'Wet', DIRTY: 'Dirty', BOTH: 'Wet + Dirty' }
const TYPE_ICON: Record<DiaperType, string> = { WET: '💧', DIRTY: '💩', BOTH: '💧💩' }

export function DiaperPage() {
  const { babyId } = useAuthStore()
  const { logs, isLoading, wetCount, dirtyCount, logMutation, editMutation, deleteMutation } = useDiaperLogs(babyId!)

  const [pendingType, setPendingType] = useState<DiaperType | null>(null)
  const [selectedColor, setSelectedColor] = useState<DiaperColor | null>(null)
  const [selectedConsistency, setSelectedConsistency] = useState<DiaperConsistency | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editType, setEditType] = useState<DiaperType>('WET')
  const [editColor, setEditColor] = useState<DiaperColor | null>(null)
  const [editConsistency, setEditConsistency] = useState<DiaperConsistency | null>(null)

  const needsDetail = pendingType === 'DIRTY' || pendingType === 'BOTH'
  const editNeedsDetail = editType === 'DIRTY' || editType === 'BOTH'

  const handleTypeSelect = (type: DiaperType) => {
    if (type === 'WET') {
      logMutation.mutate({ type }, { onSuccess: () => setPendingType(null) })
    } else {
      setPendingType(type)
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
      { onSuccess: () => { setPendingType(null); setSelectedColor(null); setSelectedConsistency(null) } },
    )
  }

  const handleStartEdit = (log: (typeof logs)[0]) => {
    setEditingId(log.id)
    setEditType(log.type)
    setEditColor(log.color)
    setEditConsistency(log.consistency)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

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

  const totalToday = wetCount + dirtyCount

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Diapers</h1>
        {totalToday > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Today: {totalToday} ({wetCount}W {dirtyCount}D)
          </span>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 md:max-w-2xl md:px-8">
        {isLoading ? (
          <DiaperSkeleton />
        ) : (
          <>
            {/* Today summary */}
            {totalToday > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-4">
                <span className="text-2xl">👶</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {totalToday} diaper{totalToday !== 1 ? 's' : ''} today
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {wetCount} wet · {dirtyCount} dirty
                  </p>
                </div>
              </div>
            )}

            {/* Quick-log buttons */}
            <div className="grid grid-cols-3 gap-3">
              {(['WET', 'DIRTY', 'BOTH'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  disabled={logMutation.isPending}
                  className={`h-20 rounded-2xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-40 flex flex-col items-center justify-center gap-1 ${
                    pendingType === type
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-700 shadow-sm'
                  }`}
                >
                  <span className="text-xl">{TYPE_ICON[type]}</span>
                  <span className="text-xs">{TYPE_LABEL[type]}</span>
                </button>
              ))}
            </div>

            {/* Detail panel for dirty/both */}
            {pendingType && needsDetail && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Color
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSelectedColor(selectedColor === opt.value ? null : opt.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          selectedColor === opt.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${opt.dot}`} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Consistency
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CONSISTENCY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSelectedConsistency(selectedConsistency === opt.value ? null : opt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          selectedConsistency === opt.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
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
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {logMutation.isPending ? 'Logging…' : 'Log diaper'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPendingType(null); setSelectedColor(null); setSelectedConsistency(null) }}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Log list */}
            {logs.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2 px-1">
                  Recent diapers
                </h2>
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
                  {logs.slice(0, 10).map((log) => {
                    if (editingId === log.id) {
                      return (
                        <div key={log.id} className="px-4 py-3 space-y-3">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Edit diaper
                          </p>

                          {/* Type buttons */}
                          <div className="flex gap-2">
                            {(['WET', 'DIRTY', 'BOTH'] as const).map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setEditType(type)}
                                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                                  editType === type
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                                }`}
                              >
                                {TYPE_ICON[type]} {TYPE_LABEL[type]}
                              </button>
                            ))}
                          </div>

                          {/* Color + consistency for dirty/both */}
                          {editNeedsDetail && (
                            <>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                  Color
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {COLOR_OPTIONS.map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => setEditColor(editColor === opt.value ? null : opt.value)}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                        editColor === opt.value
                                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                                      }`}
                                    >
                                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${opt.dot}`} />
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                                  Consistency
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {CONSISTENCY_OPTIONS.map((opt) => (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => setEditConsistency(editConsistency === opt.value ? null : opt.value)}
                                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                        editConsistency === opt.value
                                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
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
                      <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-sm flex-shrink-0">
                          {TYPE_ICON[log.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                            {TYPE_LABEL[log.type]}
                            {log.color && (
                              <span className="text-gray-500 dark:text-gray-400 font-normal">
                                {' · '}{log.color.charAt(0) + log.color.slice(1).toLowerCase()}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {formatTimeAgo(log.occurredAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(log)}
                          className="p-2 text-gray-300 dark:text-gray-600 hover:text-blue-400 dark:hover:text-blue-500 transition-colors flex-shrink-0"
                          aria-label={`Edit ${TYPE_LABEL[log.type]} diaper log`}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(log.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 -mr-1 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 disabled:opacity-40 transition-colors flex-shrink-0"
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
          </>
        )}
      </div>
    </div>
  )
}
