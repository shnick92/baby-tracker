import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { groupBy } from '@lib/utils/groupBy'
import { TrashIcon, PencilIcon, ExternalLinkIcon, LinkIcon, CheckIcon } from '@components/icons'
import type { PurchaseStatus } from '@tracker/shared'

import { usePurchases } from './usePurchases'
import { PurchasesSkeleton } from './PurchasesSkeleton'

const addPurchaseSchema = z.object({
  name: z.string().min(1, 'Required'),
  category: z.string().optional(),
  price: z.string().optional(),
  url: z.string().optional(),
})
type AddPurchaseForm = z.infer<typeof addPurchaseSchema>

const editPurchaseSchema = z.object({
  name: z.string().min(1, 'Required'),
  category: z.string().optional(),
  price: z.string().optional(),
  url: z.string().optional(),
  notes: z.string().optional(),
})
type EditPurchaseForm = z.infer<typeof editPurchaseSchema>

const STATUS_LABELS: Record<PurchaseStatus, string> = {
  NEEDED: 'Need',
  BOUGHT: 'Bought',
  GIFTED: 'Gifted',
  SKIP: 'Skip',
}

const STATUS_COLORS: Record<PurchaseStatus, string> = {
  NEEDED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  BOUGHT: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  GIFTED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  SKIP: 'bg-red-50 text-red-400 dark:bg-red-900/20 dark:text-red-400',
}

const STATUS_CYCLE: PurchaseStatus[] = ['NEEDED', 'BOUGHT', 'GIFTED', 'SKIP']

const nextStatus = (current: PurchaseStatus): PurchaseStatus =>
  STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length]

const inputCls =
  'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export function PurchasesPage() {
  const [addingItem, setAddingItem] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyLink = (id: string, shortCode: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/s/${shortCode}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }
  const { data, isLoading, cycleMutation, addMutation, editMutation, deleteItemMutation, deleteGroupMutation } = usePurchases()

  const addForm = useForm<AddPurchaseForm>({
    resolver: zodResolver(addPurchaseSchema),
    defaultValues: { name: '', category: '', price: '', url: '' },
  })
  const addName = addForm.watch('name')

  const editForm = useForm<EditPurchaseForm>({
    resolver: zodResolver(editPurchaseSchema),
  })

  const purchases = data?.data ?? []
  const meta = data?.meta
  const grouped = groupBy(purchases, (p) => p.category)

  const handleStartEdit = (purchase: (typeof purchases)[number]) => {
    setEditingId(purchase.id)
    editForm.reset({
      name: purchase.name,
      category: purchase.category,
      price: purchase.price?.toString() ?? '',
      url: purchase.url ?? '',
      notes: purchase.notes ?? '',
    })
  }

  const handleCancelEdit = () => setEditingId(null)

  const onAddSubmit = addForm.handleSubmit((values) => {
    addMutation.mutate(
      {
        name: values.name.trim(),
        category: values.category?.trim() || 'Other',
        price: values.price ? parseFloat(values.price) : undefined,
        url: values.url?.trim() || undefined,
      },
      { onSuccess: () => { addForm.reset(); setAddingItem(false) } },
    )
  })

  const onEditSubmit = editForm.handleSubmit((values) => {
    if (!editingId) return
    editMutation.mutate(
      {
        id: editingId,
        name: values.name.trim(),
        category: values.category?.trim() || undefined,
        price: values.price ? parseFloat(values.price) : undefined,
        url: values.url?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      },
      { onSuccess: () => setEditingId(null) },
    )
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">Purchases</h1>
          {meta && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {meta.bought} of {meta.total} acquired
            </p>
          )}
        </div>
      </header>

      {meta && meta.total > 0 && (
        <div className="h-1 bg-gray-100 dark:bg-gray-700">
          <div
            className="h-1 bg-green-500 transition-all duration-300"
            style={{ width: `${(meta.bought / meta.total) * 100}%` }}
          />
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-4 md:max-w-4xl md:px-8">
        {isLoading ? (
          <PurchasesSkeleton />
        ) : (
          <div className="space-y-6 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {category}
                </h2>
                <button
                  onClick={() => deleteGroupMutation.mutate(items.map((p) => p.id))}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 dark:text-gray-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  aria-label={`Delete all items in ${category}`}
                >
                  <TrashIcon />
                </button>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
                {items.map((purchase) =>
                  editingId === purchase.id ? (
                    <form
                      key={purchase.id}
                      onSubmit={onEditSubmit}
                      className="px-4 py-3 space-y-2.5"
                    >
                      <div>
                        <input
                          autoFocus
                          type="text"
                          placeholder="Item name *"
                          {...editForm.register('name')}
                          className={`${inputCls} ${editForm.formState.errors.name ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
                        />
                        {editForm.formState.errors.name && (
                          <p className="text-xs text-red-500 mt-1 text-right">{editForm.formState.errors.name.message}</p>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Category"
                        {...editForm.register('category')}
                        className={inputCls}
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Price"
                          {...editForm.register('price')}
                          className={`${inputCls} flex-1`}
                        />
                        <input
                          type="text"
                          placeholder="URL"
                          {...editForm.register('url')}
                          className={`${inputCls} flex-1`}
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        {...editForm.register('notes')}
                        className={inputCls}
                      />
                      <div className="flex gap-2 pt-0.5">
                        <button
                          type="submit"
                          disabled={editMutation.isPending}
                          className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                        >
                          {editMutation.isPending ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div
                      key={purchase.id}
                      className={`flex items-center gap-3 px-4 py-3.5 ${
                        purchase.status === 'SKIP' ? 'opacity-40' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${
                            purchase.status === 'BOUGHT' || purchase.status === 'GIFTED'
                              ? 'line-through text-gray-400 dark:text-gray-600'
                              : 'text-gray-800 dark:text-gray-100'
                          }`}
                        >
                          {purchase.name}
                        </p>
                        {purchase.price && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">${purchase.price.toFixed(2)}</p>
                        )}
                      </div>
                      {purchase.url && (
                        <a
                          href={purchase.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-300 dark:text-gray-600 hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          aria-label={`Open link for ${purchase.name}`}
                        >
                          <ExternalLinkIcon />
                        </a>
                      )}
                      {purchase.shortCode && (
                        <button
                          type="button"
                          onClick={() => handleCopyLink(purchase.id, purchase.shortCode!)}
                          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-300 dark:text-gray-600 hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          aria-label={`Copy short link for ${purchase.name}`}
                        >
                          {copiedId === purchase.id ? (
                            <CheckIcon className="w-4 h-4 text-green-500" />
                          ) : (
                            <LinkIcon />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() =>
                          cycleMutation.mutate({ id: purchase.id, status: nextStatus(purchase.status) })
                        }
                        className={`flex-shrink-0 h-11 px-3 flex items-center rounded-full text-xs font-medium transition-colors ${
                          STATUS_COLORS[purchase.status]
                        }`}
                      >
                        {STATUS_LABELS[purchase.status]}
                      </button>
                      <button
                        onClick={() => handleStartEdit(purchase)}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-300 dark:text-gray-600 hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        aria-label={`Edit ${purchase.name}`}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        onClick={() => deleteItemMutation.mutate(purchase.id)}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-300 dark:text-gray-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        aria-label={`Delete ${purchase.name}`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
          </div>
        )}

        <div className="mt-6">
        {addingItem ? (
          <form
            onSubmit={onAddSubmit}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3"
          >
            <div>
              <input
                autoFocus
                type="text"
                placeholder="Item name *"
                {...addForm.register('name')}
                className={`${inputCls} ${addForm.formState.errors.name ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
              />
              {addForm.formState.errors.name && (
                <p className="text-xs text-red-500 mt-1 text-right">{addForm.formState.errors.name.message}</p>
              )}
            </div>
            <input
              type="text"
              placeholder="Category (e.g. Nursery, Feeding)"
              {...addForm.register('category')}
              className={inputCls}
            />
            <input
              type="number"
              step="any"
              min="0"
              placeholder="Price (optional)"
              {...addForm.register('price')}
              className={inputCls}
            />
            <input
              type="text"
              placeholder="URL (optional)"
              {...addForm.register('url')}
              className={inputCls}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!addName?.trim() || addMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {addMutation.isPending ? 'Adding…' : 'Add item'}
              </button>
              <button
                type="button"
                onClick={() => { addForm.reset(); setAddingItem(false) }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingItem(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            + Add item
          </button>
        )}
        </div>
      </div>
    </div>
  )
}
