import { useEffect, useRef, useState } from 'react'
import { Heart, Pencil, Trash2, Plus, X, Check, Baby, ChevronDown, ChevronUp } from 'lucide-react'

import { useAuthStore } from '@stores/authStore'

import { useBabyNames } from './useBabyNames'
import type { BabyName } from './useBabyNames'

const REACTION_EMOJIS = ['❤️', '😍', '🤔', '😬', '👎', '🥰', '🌟', '💯']
const FAMILY_SURNAME = import.meta.env['VITE_FAMILY_SURNAME'] as string | undefined

const PRESET_GROUPS = ['Favorites', 'Maybe', 'Wild Cards', "Partner's Picks", 'Girl', 'Boy', 'Gender Neutral']

const btnGradient =
  'bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-400 hover:to-blue-400 text-white transition-all'

const inputCls =
  'w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400'

function fullName(name: BabyName): string {
  const parts = [name.firstName, name.middleName, FAMILY_SURNAME].filter(Boolean)
  return parts.join(' ')
}

type NameFormState = {
  firstName: string
  middleName: string
  nickname: string
  pronunciation: string
  groups: string[]
}

const emptyForm: NameFormState = { firstName: '', middleName: '', nickname: '', pronunciation: '', groups: [] }

// Tag-style multi-group input with autocomplete suggestions
function GroupTagInput({
  selected,
  onChange,
  knownGroups,
}: {
  selected: string[]
  onChange: (groups: string[]) => void
  knownGroups: string[]
}) {
  const [inputVal, setInputVal] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Merge presets + known groups, deduplicated, sorted
  const allSuggestions = Array.from(
    new Set([...knownGroups, ...PRESET_GROUPS])
  ).sort()

  const filtered = allSuggestions.filter(
    (g) =>
      !selected.includes(g) &&
      (!inputVal || g.toLowerCase().includes(inputVal.toLowerCase()))
  )

  const addGroup = (g: string) => {
    const trimmed = g.trim()
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed])
    }
    setInputVal('')
    inputRef.current?.focus()
  }

  const removeGroup = (g: string) => onChange(selected.filter((x) => x !== g))

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) {
      e.preventDefault()
      addGroup(inputVal)
    } else if (e.key === 'Backspace' && !inputVal && selected.length > 0) {
      removeGroup(selected[selected.length - 1])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Groups</label>
      <div
        className="min-h-[42px] flex flex-wrap gap-1.5 items-center px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 cursor-text focus-within:ring-2 focus-within:ring-blue-400"
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((g) => (
          <span
            key={g}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-gradient-to-r from-pink-100 to-blue-100 dark:from-pink-900/30 dark:to-blue-900/30 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-700"
          >
            {g}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeGroup(g) }}
              className="hover:text-red-500 transition-colors"
              aria-label={`Remove ${g}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => { setInputVal(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? 'e.g. Girl, Favorites…' : ''}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none py-1"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden max-h-44 overflow-y-auto">
          {filtered.map((g) => (
            <button
              key={g}
              type="button"
              onMouseDown={() => addGroup(g)}
              className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {g}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function NameForm({
  initial,
  isPending,
  onSubmit,
  onCancel,
  submitLabel,
  knownGroups,
}: {
  initial: NameFormState
  isPending: boolean
  onSubmit: (v: NameFormState) => void
  onCancel: () => void
  submitLabel: string
  knownGroups: string[]
}) {
  const [v, setV] = useState(initial)
  const [showExtra, setShowExtra] = useState(!!(initial.nickname || initial.pronunciation || initial.groups.length > 0))

  const field = (key: Exclude<keyof NameFormState, 'groups'>) => ({
    value: v[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setV((s) => ({ ...s, [key]: e.target.value })),
  })

  const preview = [v.firstName.trim(), v.middleName.trim(), FAMILY_SURNAME].filter(Boolean).join(' ')

  return (
    <div className="p-4 space-y-3">
      {/* Required fields */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
            First name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            {...field('firstName')}
            placeholder="e.g. Emma"
            maxLength={100}
            className={inputCls}
            onKeyDown={(e) => { if (e.key === 'Enter' && v.firstName.trim()) onSubmit(v) }}
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Middle name</label>
          <input type="text" {...field('middleName')} placeholder="e.g. Grace" maxLength={100} className={inputCls} />
        </div>
      </div>

      {/* Preview */}
      {v.firstName.trim() && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Preview:{' '}
          <span className="font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
            {preview}
          </span>
        </p>
      )}

      {/* Optional fields toggle */}
      <button
        type="button"
        onClick={() => setShowExtra((x) => !x)}
        className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {showExtra ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {showExtra ? 'Hide' : 'Add'} nickname, pronunciation &amp; groups
      </button>

      {showExtra && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Nickname</label>
              <input type="text" {...field('nickname')} placeholder="e.g. Em" maxLength={100} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Pronunciation</label>
              <input type="text" {...field('pronunciation')} placeholder='e.g. "EE-mah"' maxLength={200} className={inputCls} />
            </div>
          </div>
          <GroupTagInput
            selected={v.groups}
            onChange={(groups) => setV((s) => ({ ...s, groups }))}
            knownGroups={knownGroups}
          />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSubmit(v)}
          disabled={!v.firstName.trim() || isPending}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 ${btnGradient}`}
        >
          <Check size={14} /> {isPending ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function NameCard({ name, currentUserId, isNew, onReact, onRemoveReaction, onEdit, onDelete }: {
  name: BabyName
  currentUserId: string
  isNew: boolean
  onReact: (nameId: string, emoji: string) => void
  onRemoveReaction: (nameId: string) => void
  onEdit: (name: BabyName) => void
  onDelete: (id: string) => void
}) {
  const [showEmojis, setShowEmojis] = useState(false)
  const myReaction = name.reactions.find((r) => r.userId === currentUserId)
  const partnerReaction = name.reactions.find((r) => r.userId !== currentUserId)

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden relative ${
      isNew
        ? 'border-purple-200 dark:border-purple-700'
        : 'border-gray-100 dark:border-gray-700'
    }`}>
      <div className={`h-0.5 bg-gradient-to-r ${isNew ? 'from-purple-400 to-pink-400' : 'from-pink-400 to-blue-400'}`} />
      <div className="p-4">
        {isNew && (
          <span className="absolute top-3 right-3 px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full leading-none">
            NEW
          </span>
        )}
        <div className="mb-3">
          <p className="text-xl font-bold tracking-wide">
            <span className="bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent inline-block">
              {fullName(name)}
            </span>
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {name.middleName && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                First: {name.firstName} · Middle: {name.middleName}{FAMILY_SURNAME ? ` · Last: ${FAMILY_SURNAME}` : ''}
              </p>
            )}
            {name.nickname && (
              <p className="text-xs text-gray-400 dark:text-gray-500">Nick: <span className="text-gray-600 dark:text-gray-300">{name.nickname}</span></p>
            )}
            {name.pronunciation && (
              <p className="text-xs text-gray-400 dark:text-gray-500">Pron: <span className="text-gray-600 dark:text-gray-300">{name.pronunciation}</span></p>
            )}
          </div>
          {name.groups.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {name.groups.map((g) => (
                <span
                  key={g}
                  className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium bg-gradient-to-r from-pink-50 to-blue-50 dark:from-pink-900/20 dark:to-blue-900/20 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-800"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">Your reaction</p>
            {myReaction ? (
              <button
                type="button"
                onClick={() => onRemoveReaction(name.id)}
                className="text-2xl leading-none hover:scale-110 transition-transform"
                aria-label="Remove reaction"
                title="Tap to remove"
              >
                {myReaction.emoji}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowEmojis((v) => !v)}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-50 to-blue-50 dark:from-pink-900/20 dark:to-blue-900/20 border border-pink-100 dark:border-pink-800 text-pink-500 dark:text-pink-400 font-medium hover:from-pink-100 hover:to-blue-100 dark:hover:from-pink-900/30 dark:hover:to-blue-900/30 transition-all"
              >
                <Heart size={12} />
                React
              </button>
            )}
          </div>

          {partnerReaction && (
            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">Partner</p>
              <span className="text-2xl leading-none">{partnerReaction.emoji}</span>
            </div>
          )}

          <div className="flex items-center gap-1 ml-auto">
            {name.addedById === currentUserId && (
              <>
                <button type="button" onClick={() => onEdit(name)}
                  className="p-2 text-gray-300 dark:text-gray-600 hover:text-blue-400 transition-colors" aria-label="Edit name">
                  <Pencil size={15} />
                </button>
                <button type="button" onClick={() => onDelete(name.id)}
                  className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors" aria-label="Delete name">
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        </div>

        {showEmojis && (
          <div className="mt-3 flex gap-2 flex-wrap items-center pt-3 border-t border-gray-50 dark:border-gray-700">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => { onReact(name.id, emoji); setShowEmojis(false) }}
                className="text-2xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
            <button type="button" onClick={() => setShowEmojis(false)}
              className="p-1 text-gray-400 hover:text-gray-600 ml-1">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Filter chip row — multi-select, AND logic
function GroupFilterChips({
  groups,
  names,
  activeGroups,
  onToggle,
  onClear,
}: {
  groups: string[]
  names: BabyName[]
  activeGroups: string[]
  onToggle: (g: string) => void
  onClear: () => void
}) {
  if (groups.length === 0) return null
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
      <button
        type="button"
        onClick={onClear}
        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
          activeGroups.length === 0
            ? 'bg-gradient-to-r from-pink-500 to-blue-500 text-white'
            : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
        }`}
      >
        All ({names.length})
      </button>
      {groups.map((g) => {
        const count = names.filter((n) => n.groups.includes(g)).length
        const active = activeGroups.includes(g)
        return (
          <button
            key={g}
            type="button"
            onClick={() => onToggle(g)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              active
                ? 'bg-gradient-to-r from-pink-500 to-blue-500 text-white'
                : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
            }`}
          >
            {g} ({count})
          </button>
        )
      })}
    </div>
  )
}

export function BabyNamesPage() {
  const { babyId, user } = useAuthStore()
  const currentUserId = user!.id
  const { names, isLoading, addMutation, editMutation, deleteMutation, reactMutation, removeReactionMutation } = useBabyNames(babyId!)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingName, setEditingName] = useState<BabyName | null>(null)
  const [activeGroups, setActiveGroups] = useState<string[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  // Track last-seen timestamp to badge partner's new names
  const lastSeenKey = `names_last_seen_${babyId}`
  const [lastSeenAt] = useState<Date | null>(() => {
    const stored = localStorage.getItem(lastSeenKey)
    return stored ? new Date(stored) : null
  })
  useEffect(() => {
    return () => { localStorage.setItem(lastSeenKey, new Date().toISOString()) }
  }, [lastSeenKey])

  // All unique groups across all names (sorted, preserving uniqueness)
  const allGroups = Array.from(
    new Set(names.flatMap((n) => n.groups))
  ).sort()

  // AND filter: name must have ALL active groups
  const visibleNames = activeGroups.length === 0
    ? names
    : names.filter((n) => activeGroups.every((g) => n.groups.includes(g)))

  const toggleGroup = (g: string) =>
    setActiveGroups((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    )

  const handleAdd = (v: NameFormState) => {
    addMutation.mutate(
      {
        firstName: v.firstName.trim(),
        middleName: v.middleName.trim() || undefined,
        nickname: v.nickname.trim() || undefined,
        pronunciation: v.pronunciation.trim() || undefined,
        groups: v.groups,
      },
      { onSuccess: () => setShowAddForm(false) },
    )
  }

  const handleSaveEdit = (v: NameFormState) => {
    if (!editingName) return
    editMutation.mutate(
      {
        id: editingName.id,
        firstName: v.firstName.trim(),
        middleName: v.middleName.trim() || null,
        nickname: v.nickname.trim() || null,
        pronunciation: v.pronunciation.trim() || null,
        groups: v.groups,
      },
      { onSuccess: () => setEditingName(null) },
    )
  }

  const openAdd = () => {
    setEditingName(null)
    setShowAddForm(true)
    requestAnimationFrame(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const closeAdd = () => setShowAddForm(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-sky-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 md:hidden border-b border-pink-100/60 dark:border-gray-700 bg-gradient-to-r from-pink-50/95 to-blue-50/95 dark:from-gray-800/95 dark:to-gray-800/95 backdrop-blur-sm">
        {showAddForm ? (
          <div>
            <div className="px-4 pt-3 pb-0 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">New name candidate</p>
              <button type="button" onClick={closeAdd} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={16} />
              </button>
            </div>
            <div className="h-0.5 mx-4 mt-2 bg-gradient-to-r from-pink-400 to-blue-400 rounded-full" />
            <NameForm
              initial={emptyForm}
              isPending={addMutation.isPending}
              onSubmit={handleAdd}
              onCancel={closeAdd}
              submitLabel="Add Name"
              knownGroups={allGroups}
            />
          </div>
        ) : (
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold bg-gradient-to-r from-pink-600 to-blue-600 dark:from-pink-400 dark:to-blue-400 bg-clip-text text-transparent">
                Baby Names
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-500">{names.length} candidate{names.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              type="button"
              onClick={openAdd}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold ${btnGradient}`}
            >
              <Plus size={14} /> Add
            </button>
          </div>
        )}

        {!showAddForm && allGroups.length > 0 && (
          <div className="px-4 pb-3">
            <GroupFilterChips
              groups={allGroups}
              names={names}
              activeGroups={activeGroups}
              onToggle={toggleGroup}
              onClear={() => setActiveGroups([])}
            />
          </div>
        )}
      </header>

      <div ref={listRef} className="max-w-2xl mx-auto px-4 py-4 space-y-3 md:max-w-5xl md:px-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse">
                <div className="h-0.5 bg-gradient-to-r from-pink-200 to-blue-200" />
                <div className="p-4">
                  <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
                  <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Desktop: group filter chips */}
            {allGroups.length > 0 && (
              <div className="hidden md:block">
                <GroupFilterChips
                  groups={allGroups}
                  names={names}
                  activeGroups={activeGroups}
                  onToggle={toggleGroup}
                  onClear={() => setActiveGroups([])}
                />
              </div>
            )}

            {/* Active filter summary */}
            {activeGroups.length > 1 && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Showing names in <span className="font-medium text-gray-600 dark:text-gray-300">{activeGroups.join(' + ')}</span>
                {' '}({visibleNames.length} match{visibleNames.length !== 1 ? 'es' : ''})
              </p>
            )}

            {visibleNames.map((name) => {
              const isNew =
                lastSeenAt !== null &&
                new Date(name.createdAt) > lastSeenAt &&
                name.addedById !== currentUserId

              return editingName?.id === name.id ? (
                <div key={name.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="h-0.5 bg-gradient-to-r from-pink-400 to-blue-400 rounded-t-2xl" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 px-4 pt-4">Edit name</p>
                  <NameForm
                    initial={{
                      firstName: editingName.firstName,
                      middleName: editingName.middleName ?? '',
                      nickname: editingName.nickname ?? '',
                      pronunciation: editingName.pronunciation ?? '',
                      groups: editingName.groups,
                    }}
                    isPending={editMutation.isPending}
                    onSubmit={handleSaveEdit}
                    onCancel={() => setEditingName(null)}
                    submitLabel="Save"
                    knownGroups={allGroups}
                  />
                </div>
              ) : (
                <NameCard
                  key={name.id}
                  name={name}
                  currentUserId={currentUserId}
                  isNew={isNew}
                  onReact={(nameId, emoji) => reactMutation.mutate({ nameId, emoji })}
                  onRemoveReaction={(nameId) => removeReactionMutation.mutate(nameId)}
                  onEdit={setEditingName}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              )
            })}

            {visibleNames.length === 0 && (
              <div className="text-center py-14">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-blue-400 flex items-center justify-center mx-auto mb-4">
                  <Baby size={32} className="text-white" />
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {activeGroups.length > 0 ? `No names in "${activeGroups.join(' + ')}"` : 'No names yet'}
                </p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                  {activeGroups.length > 0 ? 'Try different filters or add a name above' : 'Tap Add to get started'}
                </p>
              </div>
            )}

            {/* Desktop add form / button */}
            <div className="hidden md:block">
              {!showAddForm ? (
                <button type="button" onClick={openAdd}
                  className={`w-full py-4 rounded-2xl text-sm font-semibold active:scale-[0.98] flex items-center justify-center gap-2 ${btnGradient}`}>
                  <Plus size={16} /> Add Name
                </button>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="h-0.5 bg-gradient-to-r from-pink-400 to-blue-400 rounded-t-2xl" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 px-4 pt-4">New name candidate</p>
                  <NameForm
                    initial={emptyForm}
                    isPending={addMutation.isPending}
                    onSubmit={handleAdd}
                    onCancel={closeAdd}
                    submitLabel="Add Name"
                    knownGroups={allGroups}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
