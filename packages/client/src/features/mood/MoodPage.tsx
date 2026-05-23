import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useAuthStore } from '@stores/authStore'
import { toDatetimeLocal } from '@lib/utils'
import { TrashIcon, PencilIcon } from '@components/icons'

import { useMoodLogs, type MoodLog, type CustomActivity } from './useMoodLogs'
import { useActivityFeed, type FeedItem } from './useActivityFeed'
import { MoodSkeleton } from './MoodSkeleton'
import {
  MOOD_STATES, BUILT_IN_ACTIVITIES, ACTIVITIES_WITH_QUALIFIER,
  MOOD_COLORS, SOURCE_COLORS,
  type BuiltInMood, type QualifierMood,
} from './moodConfig'

const editSchema = z.object({
  mood: z.enum(['HAPPY', 'FUSSY', 'CRYING', 'ALERT', 'BATH', 'WALK']).optional(),
  qualifier: z.enum(['HAPPY', 'FUSSY', 'CRYING', 'ALERT']).optional(),
  customActivityId: z.string().optional(),
  occurredAt: z.string().min(1, 'Required'),
  notes: z.string().max(500, 'Max 500 chars').optional(),
})
type EditForm = z.infer<typeof editSchema>

const inputCls =
  'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

type PendingActivity =
  | { type: 'builtin'; mood: BuiltInMood; label: string; emoji: string }
  | { type: 'custom'; activity: CustomActivity }

function QualifierSheet({
  pending,
  onConfirm,
  onDismiss,
}: {
  pending: PendingActivity
  onConfirm: (qualifier: QualifierMood | null) => void
  onDismiss: () => void
}) {
  const label = pending.type === 'builtin' ? pending.label : pending.activity.name
  const emoji = pending.type === 'builtin' ? pending.emoji : pending.activity.emoji

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onDismiss}>
      <div
        className="bg-white dark:bg-gray-800 rounded-t-2xl px-4 pb-8 pt-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 text-center mb-1">
          {emoji} {label} logged
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-5">
          How was baby? (optional)
        </p>
        <div className="flex gap-2 justify-center mb-4">
          {MOOD_STATES.map(({ mood, label: mLabel, emoji: mEmoji }) => (
            <button
              key={mood}
              onClick={() => onConfirm(mood)}
              className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-200 dark:hover:border-violet-700 transition-all active:scale-95"
            >
              <span className="text-xl">{mEmoji}</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">{mLabel}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => onConfirm(null)}
          className="w-full py-3 rounded-xl text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          Skip — log {label} only
        </button>
      </div>
    </div>
  )
}

function FeedRow({
  item,
  onEdit,
  onDelete,
  isDeleting,
}: {
  item: FeedItem
  onEdit?: () => void
  onDelete?: () => void
  isDeleting?: boolean
}) {
  const time = new Date(item.time)
  const timeStr = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const dateStr = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const isToday = time.toDateString() === new Date().toDateString()

  const bgColor = item.source !== 'mood' ? SOURCE_COLORS[item.source] : ''

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${bgColor}`}>
      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-base flex-shrink-0">
        {item.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
          {item.label}
          {item.source === 'mood' && item.qualifier && (
            <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1.5">
              · {MOOD_STATES.find((m) => m.label === item.qualifier)?.emoji} {item.qualifier}
            </span>
          )}
          {item.detail && (
            <span className="text-xs font-normal text-gray-400 dark:text-gray-500 ml-1.5">
              · {item.detail}
            </span>
          )}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {timeStr}{!isToday && ` · ${dateStr}`}
          {item.source !== 'mood' && (
            <span className="ml-1.5 text-[10px] text-gray-300 dark:text-gray-600">
              via {item.source === 'tummytime' ? 'Tummy time' : item.source.charAt(0).toUpperCase() + item.source.slice(1)}
            </span>
          )}
        </p>
      </div>
      {item.source === 'mood' && onEdit && onDelete && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-violet-400 dark:hover:text-violet-500 transition-colors"
            aria-label="Edit"
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1.5 -mr-1 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 disabled:opacity-40 transition-colors"
            aria-label="Delete"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  )
}

export function MoodPage() {
  const { babyId } = useAuthStore()
  const {
    customActivities, logMutation, editMutation, deleteMutation,
    createActivityMutation, deleteActivityMutation,
  } = useMoodLogs(babyId!)
  const { feedItems, moodLogs, isLoading } = useActivityFeed(babyId!)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingActivity, setPendingActivity] = useState<PendingActivity | null>(null)
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const emojiInputRef = useRef<HTMLInputElement>(null)

  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  const today = new Date().toDateString()
  const todayLogs = moodLogs.filter((l) => new Date(l.occurredAt).toDateString() === today)

  const handleMoodTap = (mood: BuiltInMood) => {
    const isQualifierActivity = ACTIVITIES_WITH_QUALIFIER.some((a) => a.mood === mood)
    if (isQualifierActivity) {
      const cfg = ACTIVITIES_WITH_QUALIFIER.find((a) => a.mood === mood)!
      setPendingActivity({ type: 'builtin', mood, label: cfg.label, emoji: cfg.emoji })
    } else {
      logMutation.mutate({ mood })
    }
  }

  const handleCustomActivityTap = (activity: CustomActivity) => {
    setPendingActivity({ type: 'custom', activity })
  }

  const handleQualifierConfirm = (qualifier: QualifierMood | null) => {
    if (!pendingActivity) return
    if (pendingActivity.type === 'builtin') {
      logMutation.mutate({ mood: pendingActivity.mood, ...(qualifier && { qualifier }) })
    } else {
      logMutation.mutate({
        customActivityId: pendingActivity.activity.id,
        ...(qualifier && { qualifier }),
      })
    }
    setPendingActivity(null)
  }

  const handleAddActivity = () => {
    if (!newName.trim() || !newEmoji.trim()) return
    createActivityMutation.mutate(
      { name: newName.trim(), emoji: newEmoji.trim() },
      { onSuccess: () => { setNewName(''); setNewEmoji(''); setShowAddActivity(false) } },
    )
  }

  const handleStartEdit = (log: MoodLog) => {
    setEditingId(log.id)
    editForm.reset({
      mood: (log.mood as EditForm['mood']) ?? undefined,
      qualifier: (log.qualifier as EditForm['qualifier']) ?? undefined,
      customActivityId: log.customActivityId ?? undefined,
      occurredAt: toDatetimeLocal(log.occurredAt),
      notes: log.notes ?? '',
    })
  }

  const onEditSubmit = editForm.handleSubmit((values) => {
    if (!editingId) return
    editMutation.mutate(
      {
        id: editingId,
        mood: values.mood ?? null,
        qualifier: values.qualifier ?? null,
        customActivityId: values.customActivityId ?? null,
        occurredAt: new Date(values.occurredAt).toISOString(),
        notes: values.notes || null,
      },
      { onSuccess: () => { setEditingId(null); editForm.reset() } },
    )
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Mood & Activity</h1>
        {todayLogs.length > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {todayLogs.length} mood log{todayLogs.length !== 1 ? 's' : ''} today
          </p>
        )}
      </header>

      {isLoading ? (
        <div className="max-w-lg mx-auto px-4 py-4">
          <MoodSkeleton />
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-4 md:max-w-3xl md:px-6 md:grid md:grid-cols-2 md:gap-6 md:items-start">

          {/* Quick-log grid — sticky on tablet so feed can scroll independently */}
          <div className="space-y-4 md:sticky md:top-4 md:self-start">

            {/* Moods */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                Mood
              </p>
              <div className="grid grid-cols-4 gap-2">
                {MOOD_STATES.map(({ mood, label, emoji }) => (
                  <button
                    key={mood}
                    onClick={() => handleMoodTap(mood as BuiltInMood)}
                    disabled={logMutation.isPending}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-4 px-2 transition-all active:scale-[0.94] disabled:opacity-60 ${MOOD_COLORS[mood]}`}
                  >
                    <span className="text-2xl leading-none">{emoji}</span>
                    <span className="text-[11px] font-medium leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Activities */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                Activity
              </p>
              <div className="grid grid-cols-4 gap-2">
                {BUILT_IN_ACTIVITIES.map(({ mood, label, emoji }) => (
                  <button
                    key={mood}
                    onClick={() => handleMoodTap(mood)}
                    disabled={logMutation.isPending}
                    className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-4 px-2 transition-all active:scale-[0.94] disabled:opacity-60 ${MOOD_COLORS[mood]}`}
                  >
                    <span className="text-2xl leading-none">{emoji}</span>
                    <span className="text-[11px] font-medium leading-tight">{label}</span>
                  </button>
                ))}

                {customActivities.map((activity) => (
                  <div key={activity.id} className="relative group">
                    <button
                      onClick={() => handleCustomActivityTap(activity)}
                      disabled={logMutation.isPending}
                      className={`w-full flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-4 px-2 transition-all active:scale-[0.94] disabled:opacity-60 ${MOOD_COLORS['CUSTOM']}`}
                    >
                      <span className="text-2xl leading-none">{activity.emoji}</span>
                      <span className="text-[11px] font-medium leading-tight truncate w-full text-center">
                        {activity.name}
                      </span>
                    </button>
                    <button
                      onClick={() => deleteActivityMutation.mutate(activity.id)}
                      disabled={deleteActivityMutation.isPending}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800/70 text-white text-[10px] items-center justify-center hidden group-hover:flex"
                      aria-label={`Remove ${activity.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {showAddActivity ? (
                  <div className="col-span-2 flex gap-2 items-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-violet-300 dark:border-violet-700 px-3 py-2">
                    <input
                      ref={emojiInputRef}
                      value={newEmoji}
                      onChange={(e) => setNewEmoji(e.target.value)}
                      placeholder="🎲"
                      maxLength={4}
                      className="w-10 text-center text-xl bg-transparent outline-none"
                    />
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Name"
                      maxLength={20}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddActivity()}
                      className="flex-1 text-xs bg-transparent outline-none text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600"
                    />
                    <button
                      onClick={handleAddActivity}
                      disabled={!newName.trim() || !newEmoji.trim() || createActivityMutation.isPending}
                      className="text-violet-500 disabled:text-gray-300 dark:disabled:text-gray-600 text-lg leading-none"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => { setShowAddActivity(false); setNewName(''); setNewEmoji('') }}
                      className="text-gray-300 dark:text-gray-600 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowAddActivity(true)
                      setTimeout(() => emojiInputRef.current?.focus(), 50)
                    }}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 py-4 px-2 text-gray-300 dark:text-gray-600 hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-400 dark:hover:text-violet-500 transition-all active:scale-[0.94]"
                  >
                    <span className="text-xl leading-none">+</span>
                    <span className="text-[11px] font-medium">Add</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
              Mood taps log instantly · Bath &amp; Walk let you add a mood
            </p>
          </div>

          {/* Merged activity feed */}
          <div className="mt-4 md:mt-0">
            {feedItems.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Activity feed
                  </p>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {feedItems.slice(0, 30).map((item) => {
                    if (item.source === 'mood' && editingId === item.id) {
                      const log = item.moodLog
                      return (
                        <form
                          key={item.id}
                          noValidate
                          onSubmit={onEditSubmit}
                          className="px-4 py-3 space-y-3"
                        >
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Edit entry
                          </p>
                          {!log.customActivityId && (
                            <select {...editForm.register('mood')} className={inputCls}>
                              <option value="">— select —</option>
                              <optgroup label="Moods">
                                {MOOD_STATES.map(({ mood, emoji, label }) => (
                                  <option key={mood} value={mood}>{emoji} {label}</option>
                                ))}
                              </optgroup>
                              <optgroup label="Activities">
                                {BUILT_IN_ACTIVITIES.map(({ mood, emoji, label }) => (
                                  <option key={mood} value={mood}>{emoji} {label}</option>
                                ))}
                              </optgroup>
                            </select>
                          )}
                          {log.customActivityId && (
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {item.emoji} {item.label}
                            </p>
                          )}
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                              Mood during activity (optional)
                            </label>
                            <select {...editForm.register('qualifier')} className={inputCls}>
                              <option value="">— none —</option>
                              {MOOD_STATES.map(({ mood, emoji, label: mLabel }) => (
                                <option key={mood} value={mood}>{emoji} {mLabel}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Time</label>
                            <input
                              type="datetime-local"
                              {...editForm.register('occurredAt')}
                              className={`${inputCls} ${editForm.formState.errors.occurredAt ? 'border-red-400 focus:ring-red-400' : ''}`}
                            />
                          </div>
                          <input
                            type="text"
                            placeholder="Notes (optional)"
                            {...editForm.register('notes')}
                            className={inputCls}
                          />
                          <div className="flex gap-2 pt-1">
                            <button
                              type="submit"
                              disabled={editMutation.isPending}
                              className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium disabled:opacity-50"
                            >
                              {editMutation.isPending ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setEditingId(null); editForm.reset() }}
                              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )
                    }

                    return (
                      <FeedRow
                        key={`${item.source}-${item.id}`}
                        item={item}
                        onEdit={item.source === 'mood' ? () => handleStartEdit(item.moodLog) : undefined}
                        onDelete={item.source === 'mood' ? () => deleteMutation.mutate(item.id) : undefined}
                        isDeleting={deleteMutation.isPending}
                      />
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <p className="text-3xl mb-2">😊</p>
                <p className="text-sm">Tap a mood or activity above to log it</p>
              </div>
            )}
          </div>
        </div>
      )}

      {pendingActivity && (
        <QualifierSheet
          pending={pendingActivity}
          onConfirm={handleQualifierConfirm}
          onDismiss={() => setPendingActivity(null)}
        />
      )}
    </div>
  )
}
