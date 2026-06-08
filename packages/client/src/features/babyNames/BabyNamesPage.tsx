import { useState } from 'react'
import { Heart, Pencil, Trash2, Plus, X, Check, Baby } from 'lucide-react'

import { useAuthStore } from '@stores/authStore'

import { useBabyNames } from './useBabyNames'
import type { BabyName } from './useBabyNames'

const REACTION_EMOJIS = ['❤️', '😍', '🤔', '😬', '👎', '🥰', '🌟', '💯']
const FAMILY_SURNAME = import.meta.env['VITE_FAMILY_SURNAME'] as string | undefined

// Pink → blue gradient applied consistently across all interactive/accent surfaces.
const btnGradient =
  'bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-400 hover:to-blue-400 text-white transition-all'

const inputCls =
  'w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400'

function fullName(name: BabyName): string {
  const parts = [name.firstName, name.middleName, FAMILY_SURNAME].filter(Boolean)
  return parts.join(' ')
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
      {/* Gradient top accent */}
      <div className="h-0.5 bg-gradient-to-r from-pink-400 to-blue-400" />

      <div className="p-4">
        {/* Full name — gradient text */}
        <div className="mb-3">
          <p className="text-xl font-bold tracking-wide bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
            {fullName(name)}
          </p>
          {name.middleName && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              First: {name.firstName} · Middle: {name.middleName}{FAMILY_SURNAME ? ` · Last: ${FAMILY_SURNAME}` : ''}
            </p>
          )}
        </div>

        {/* Reactions */}
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

        {/* Emoji picker */}
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
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')

  const [editingName, setEditingName] = useState<BabyName | null>(null)
  const [editFirst, setEditFirst] = useState('')
  const [editMiddle, setEditMiddle] = useState('')

  const handleAdd = () => {
    if (!firstName.trim()) return
    addMutation.mutate(
      { firstName: firstName.trim(), middleName: middleName.trim() || undefined },
      { onSuccess: () => { setFirstName(''); setMiddleName(''); setShowAddForm(false) } }
    )
  }

  const handleSaveEdit = () => {
    if (!editingName || !editFirst.trim()) return
    editMutation.mutate(
      { id: editingName.id, firstName: editFirst.trim(), middleName: editMiddle.trim() || null },
      { onSuccess: () => setEditingName(null) }
    )
  }

  const startEdit = (name: BabyName) => {
    setEditingName(name)
    setEditFirst(name.firstName)
    setEditMiddle(name.middleName ?? '')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-sky-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* Mobile header — gradient bg */}
      <header className="sticky top-0 z-10 md:hidden border-b border-pink-100/60 dark:border-gray-700 px-4 py-3 flex items-center justify-between bg-gradient-to-r from-pink-50/90 to-blue-50/90 dark:from-gray-800/90 dark:to-gray-800/90 backdrop-blur-sm">
        <div>
          <h1 className="text-base font-semibold bg-gradient-to-r from-pink-600 to-blue-600 dark:from-pink-400 dark:to-blue-400 bg-clip-text text-transparent">
            Baby Names
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">{names.length} candidate{names.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-blue-400 flex items-center justify-center">
          <Baby size={16} className="text-white" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 md:max-w-5xl md:px-6">
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
            {names.map((name) => (
              editingName?.id === name.id ? (
                <div key={name.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="h-0.5 bg-gradient-to-r from-pink-400 to-blue-400" />
                  <div className="p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Edit name</p>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">First name <span className="text-red-400">*</span></label>
                      <input type="text" value={editFirst} onChange={(e) => setEditFirst(e.target.value)} placeholder="e.g. Emma" maxLength={100} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Middle name <span className="text-gray-400">(optional)</span></label>
                      <input type="text" value={editMiddle} onChange={(e) => setEditMiddle(e.target.value)} placeholder="e.g. Grace" maxLength={100} className={inputCls} />
                    </div>
                    {editFirst.trim() && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Preview: <span className="font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
                          {[editFirst.trim(), editMiddle.trim(), FAMILY_SURNAME].filter(Boolean).join(' ')}
                        </span>
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button type="button" onClick={handleSaveEdit} disabled={!editFirst.trim() || editMutation.isPending}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 ${btnGradient}`}>
                        <Check size={14} /> {editMutation.isPending ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" onClick={() => setEditingName(null)}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <NameCard
                  key={name.id}
                  name={name}
                  currentUserId={currentUserId}
                  onReact={(nameId, emoji) => reactMutation.mutate({ nameId, emoji })}
                  onRemoveReaction={(nameId) => removeReactionMutation.mutate(nameId)}
                  onEdit={startEdit}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              )
            ))}

            {names.length === 0 && !showAddForm && (
              <div className="text-center py-14">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-blue-400 flex items-center justify-center mx-auto mb-4">
                  <Baby size={32} className="text-white" />
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500">No names yet</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Add your first baby name candidate below</p>
              </div>
            )}

            {!showAddForm ? (
              <button type="button" onClick={() => setShowAddForm(true)}
                className={`w-full py-4 rounded-2xl text-sm font-semibold active:scale-[0.98] flex items-center justify-center gap-2 ${btnGradient}`}>
                <Plus size={16} /> Add Name
              </button>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="h-0.5 bg-gradient-to-r from-pink-400 to-blue-400" />
                <div className="p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">New name candidate</p>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">First name <span className="text-red-400">*</span></label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Emma" maxLength={100} className={inputCls}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Middle name <span className="text-gray-400">(optional)</span></label>
                    <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="e.g. Grace" maxLength={100} className={inputCls} />
                  </div>
                  {firstName.trim() && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Preview: <span className="font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
                        {[firstName.trim(), middleName.trim(), FAMILY_SURNAME].filter(Boolean).join(' ')}
                      </span>
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAdd} disabled={!firstName.trim() || addMutation.isPending}
                      className={`flex-1 py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50 ${btnGradient}`}>
                      {addMutation.isPending ? 'Adding…' : 'Add Name'}
                    </button>
                    <button type="button" onClick={() => { setShowAddForm(false); setFirstName(''); setMiddleName('') }}
                      className="px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
