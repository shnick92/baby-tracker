import { useRef, useState } from 'react'
import { Heart, Pencil, Trash2, Plus, X, Check, Baby, ChevronDown, ChevronUp } from 'lucide-react'

import { useAuthStore } from '@stores/authStore'

import { useBabyNames } from './useBabyNames'
import type { BabyName } from './useBabyNames'

const REACTION_EMOJIS = ['❤️', '😍', '🤔', '😬', '👎', '🥰', '🌟', '💯']
const FAMILY_SURNAME = import.meta.env['VITE_FAMILY_SURNAME'] as string | undefined

const PRESET_GROUPS = ['Favorites', 'Maybe', 'Wild Cards', "Partner's Picks"]

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
  group: string
}

const emptyForm: NameFormState = { firstName: '', middleName: '', nickname: '', pronunciation: '', group: '' }

function NameForm({
  initial,
  isPending,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial: NameFormState
  isPending: boolean
  onSubmit: (v: NameFormState) => void
  onCancel: () => void
  submitLabel: string
}) {
  const [v, setV] = useState(initial)
  const [showExtra, setShowExtra] = useState(!!(initial.nickname || initial.pronunciation || initial.group))
  const [groupInput, setGroupInput] = useState(initial.group)
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false)

  const field = (key: keyof NameFormState) => ({
    value: key === 'group' ? groupInput : v[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      if (key === 'group') {
        setGroupInput(e.target.value)
        setV((s) => ({ ...s, group: e.target.value }))
      } else {
        setV((s) => ({ ...s, [key]: e.target.value }))
      }
    },
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
            onKeyDown={(e) => { if (e.key === 'Enter' && v.firstName.trim()) onSubmit({ ...v, group: groupInput }) }}
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
        {showExtra ? 'Hide' : 'Add'} nickname, pronunciation &amp; group
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
          <div className="relative">
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Group</label>
            <input
              type="text"
              {...field('group')}
              placeholder="e.g. Favorites"
              maxLength={50}
              className={inputCls}
              onFocus={() => setShowGroupSuggestions(true)}
              onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 150)}
            />
            {showGroupSuggestions && (
              <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
                {PRESET_GROUPS.filter((g) => !groupInput || g.toLowerCase().includes(groupInput.toLowerCase())).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onMouseDown={() => { setGroupInput(g); setV((s) => ({ ...s, group: g })); setShowGroupSuggestions(false) }}
                    className="w-full text-left px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSubmit({ ...v, group: groupInput })}
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

function NameCard({ name, currentUserId, onReact, onRemoveReaction, onEdit, onDelete }: {
  name: BabyName
  currentUserId: string
  onReact: (nameId: string, emoji: string) => void
  onRemoveReaction: (nameId: string) => void
  onEdit: (name: BabyName) => void
  onDelete: (id: string) => void
}) {
  const [showEmojis, setShowEmojis] = useState(false)
  const myReaction = name.reactions.find((r) => r.userId === currentUserId)
  const partnerReaction = name.reactions.find((r) => r.userId !== currentUserId)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-pink-400 to-blue-400" />
      <div className="p-4">
        <div className="mb-3">
          <p className="text-xl font-bold tracking-wide bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
            {fullName(name)}
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

export function BabyNamesPage() {
  const { babyId, user } = useAuthStore()
  const currentUserId = user!.id
  const { names, isLoading, addMutation, editMutation, deleteMutation, reactMutation, removeReactionMutation } = useBabyNames(babyId!)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingName, setEditingName] = useState<BabyName | null>(null)
  const [activeGroup, setActiveGroup] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Derived: unique groups across all names (preserving order of first appearance)
  const groups = Array.from(new Set(names.map((n) => n.group).filter((g): g is string => !!g)))

  const visibleNames = activeGroup === null
    ? names
    : names.filter((n) => n.group === activeGroup)

  const handleAdd = (v: NameFormState) => {
    addMutation.mutate(
      {
        firstName: v.firstName.trim(),
        middleName: v.middleName.trim() || undefined,
        nickname: v.nickname.trim() || undefined,
        pronunciation: v.pronunciation.trim() || undefined,
        group: v.group.trim() || undefined,
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
        group: v.group.trim() || null,
      },
      { onSuccess: () => setEditingName(null) },
    )
  }

  const openAdd = () => {
    setEditingName(null)
    setShowAddForm(true)
    // Give the sticky header time to expand before scrolling
    requestAnimationFrame(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const closeAdd = () => setShowAddForm(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-sky-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Sticky header — collapses into add form when open */}
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

        {/* Group filter chips — only shown when there are groups and form is not open */}
        {!showAddForm && groups.length > 0 && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveGroup(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeGroup === null
                  ? 'bg-gradient-to-r from-pink-500 to-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
              }`}
            >
              All ({names.length})
            </button>
            {groups.map((g) => {
              const count = names.filter((n) => n.group === g).length
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setActiveGroup(activeGroup === g ? null : g)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    activeGroup === g
                      ? 'bg-gradient-to-r from-pink-500 to-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {g} ({count})
                </button>
              )
            })}
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
            {groups.length > 0 && (
              <div className="hidden md:flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveGroup(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    activeGroup === null
                      ? 'bg-gradient-to-r from-pink-500 to-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  All ({names.length})
                </button>
                {groups.map((g) => {
                  const count = names.filter((n) => n.group === g).length
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setActiveGroup(activeGroup === g ? null : g)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        activeGroup === g
                          ? 'bg-gradient-to-r from-pink-500 to-blue-500 text-white'
                          : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {g} ({count})
                    </button>
                  )
                })}
              </div>
            )}

            {visibleNames.map((name) =>
              editingName?.id === name.id ? (
                <div key={name.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="h-0.5 bg-gradient-to-r from-pink-400 to-blue-400" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 px-4 pt-4">Edit name</p>
                  <NameForm
                    initial={{
                      firstName: editingName.firstName,
                      middleName: editingName.middleName ?? '',
                      nickname: editingName.nickname ?? '',
                      pronunciation: editingName.pronunciation ?? '',
                      group: editingName.group ?? '',
                    }}
                    isPending={editMutation.isPending}
                    onSubmit={handleSaveEdit}
                    onCancel={() => setEditingName(null)}
                    submitLabel="Save"
                  />
                </div>
              ) : (
                <NameCard
                  key={name.id}
                  name={name}
                  currentUserId={currentUserId}
                  onReact={(nameId, emoji) => reactMutation.mutate({ nameId, emoji })}
                  onRemoveReaction={(nameId) => removeReactionMutation.mutate(nameId)}
                  onEdit={setEditingName}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              )
            )}

            {visibleNames.length === 0 && (
              <div className="text-center py-14">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-blue-400 flex items-center justify-center mx-auto mb-4">
                  <Baby size={32} className="text-white" />
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {activeGroup ? `No names in "${activeGroup}" yet` : 'No names yet'}
                </p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                  {activeGroup ? 'Try a different group or add one above' : 'Tap Add to get started'}
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
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="h-0.5 bg-gradient-to-r from-pink-400 to-blue-400" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 px-4 pt-4">New name candidate</p>
                  <NameForm
                    initial={emptyForm}
                    isPending={addMutation.isPending}
                    onSubmit={handleAdd}
                    onCancel={closeAdd}
                    submitLabel="Add Name"
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
