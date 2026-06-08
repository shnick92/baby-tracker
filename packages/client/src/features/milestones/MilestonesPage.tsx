import { useState } from 'react'
import { Check, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

import { useAuthStore } from '@stores/authStore'
import { MILESTONE_CATEGORY_LABELS } from '@tracker/shared'

import { useMilestones } from './useMilestones'
import type { Milestone } from './useMilestones'

const CATEGORY_ORDER = [
  'MOTOR_GROSS',
  'MOTOR_FINE',
  'SOCIAL',
  'LANGUAGE',
  'COGNITIVE',
  'FEEDING',
  'CUSTOM',
] as const

const CATEGORY_EMOJI: Record<string, string> = {
  MOTOR_GROSS: '🏃',
  MOTOR_FINE: '✋',
  SOCIAL: '😊',
  LANGUAGE: '💬',
  COGNITIVE: '🧠',
  FEEDING: '🍼',
  CUSTOM: '⭐',
}

function toLocalDateValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function MilestoneRow({ milestone, onToggle, onDelete }: {
  milestone: Milestone
  onToggle: (id: string, achieved: boolean) => void
  onDelete?: (id: string) => void
}) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [dateValue, setDateValue] = useState(
    milestone.achievedAt ? toLocalDateValue(new Date(milestone.achievedAt)) : toLocalDateValue(new Date())
  )

  const isAchieved = !!milestone.achievedAt

  const handleCheck = () => {
    if (isAchieved) {
      onToggle(milestone.id, false)
    } else {
      setShowDatePicker(true)
    }
  }

  const handleDateConfirm = () => {
    onToggle(milestone.id, true)
    setShowDatePicker(false)
  }

  return (
    <div className={`px-4 py-3 flex items-start gap-3 ${isAchieved ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}>
      <button
        type="button"
        onClick={handleCheck}
        className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          isAchieved
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
        }`}
        aria-label={isAchieved ? 'Mark as not achieved' : 'Mark as achieved'}
      >
        {isAchieved && <Check size={12} strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isAchieved ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-800 dark:text-gray-100'}`}>
          {milestone.label}
        </p>
        {isAchieved && milestone.achievedAt && (
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
            ✓ {new Date(milestone.achievedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
        {showDatePicker && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button
              type="button"
              onClick={handleDateConfirm}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-medium"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowDatePicker(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {milestone.category === 'CUSTOM' && onDelete && (
        <button
          type="button"
          onClick={() => onDelete(milestone.id)}
          className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 transition-colors flex-shrink-0"
          aria-label="Delete custom milestone"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

function CategorySection({ category, milestones, onToggle, onDelete, defaultOpen }: {
  category: string
  milestones: Milestone[]
  onToggle: (id: string, achieved: boolean, dateValue?: string) => void
  onDelete?: (id: string) => void
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const achievedCount = milestones.filter((m) => m.achievedAt).length
  const label = MILESTONE_CATEGORY_LABELS[category as keyof typeof MILESTONE_CATEGORY_LABELS] ?? category
  const emoji = CATEGORY_EMOJI[category] ?? '📋'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <span className="text-lg">{emoji}</span>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {achievedCount} of {milestones.length} achieved
          </p>
        </div>
        {/* Progress bar */}
        <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all"
            style={{ width: milestones.length > 0 ? `${(achievedCount / milestones.length) * 100}%` : '0%' }}
          />
        </div>
        {open ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="divide-y divide-gray-50 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-700">
          {milestones.map((m) => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function MilestonesPage() {
  const { babyId } = useAuthStore()
  const { milestones, isLoading, achieveMutation, addCustomMutation, deleteCustomMutation } = useMilestones(babyId!)
  const [newLabel, setNewLabel] = useState('')
  const [showAddCustom, setShowAddCustom] = useState(false)

  const grouped = CATEGORY_ORDER.reduce<Record<string, Milestone[]>>((acc, cat) => {
    const items = milestones.filter((m) => m.category === cat)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  const handleToggle = (id: string, achieved: boolean) => {
    achieveMutation.mutate({ id, achievedAt: achieved ? new Date().toISOString() : null })
  }

  const handleAddCustom = () => {
    if (!newLabel.trim()) return
    addCustomMutation.mutate(newLabel.trim(), {
      onSuccess: () => {
        setNewLabel('')
        setShowAddCustom(false)
      },
    })
  }

  const totalAchieved = milestones.filter((m) => m.achievedAt).length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Milestones</h1>
          {milestones.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {totalAchieved} of {milestones.length} achieved
            </p>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 md:max-w-5xl md:px-6">

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Overall progress */}
            {milestones.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 hidden md:block">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Overall progress</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{totalAchieved} / {milestones.length}</p>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${(totalAchieved / milestones.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {Object.entries(grouped).map(([cat, items], i) => (
              <CategorySection
                key={cat}
                category={cat}
                milestones={items}
                onToggle={handleToggle}
                onDelete={cat === 'CUSTOM' ? (id) => deleteCustomMutation.mutate(id) : undefined}
                defaultOpen={i < 2}
              />
            ))}

            {/* Add custom milestone */}
            {!showAddCustom ? (
              <button
                type="button"
                onClick={() => setShowAddCustom(true)}
                className="w-full py-3.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500 flex items-center justify-center gap-2 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <Plus size={16} />
                Add custom milestone
              </button>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Custom milestone</p>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. First tooth"
                  maxLength={200}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustom() }}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={handleAddCustom} disabled={!newLabel.trim() || addCustomMutation.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50">
                    {addCustomMutation.isPending ? 'Adding…' : 'Add Milestone'}
                  </button>
                  <button type="button" onClick={() => { setShowAddCustom(false); setNewLabel('') }}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
