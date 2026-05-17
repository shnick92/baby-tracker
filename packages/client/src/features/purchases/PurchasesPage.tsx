import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { groupBy } from '@lib/utils/groupBy'
import { TrashIcon } from '@components/icons'
import type { PurchaseStatus } from '@tracker/shared'

import { usePurchases } from './usePurchases'

const addPurchaseSchema = z.object({
  name: z.string().min(1, 'Required'),
  category: z.string().optional(),
  price: z.string().optional(),
  url: z.string().optional(),
})
type AddPurchaseForm = z.infer<typeof addPurchaseSchema>


const STATUS_LABELS: Record<PurchaseStatus, string> = {
  NEEDED: 'Need',
  BOUGHT: 'Bought',
  GIFTED: 'Gifted',
  SKIP: 'Skip',
}

const STATUS_COLORS: Record<PurchaseStatus, string> = {
  NEEDED: 'bg-gray-100 text-gray-600',
  BOUGHT: 'bg-green-100 text-green-700',
  GIFTED: 'bg-purple-100 text-purple-700',
  SKIP: 'bg-red-50 text-red-400',
}

const STATUS_CYCLE: PurchaseStatus[] = ['NEEDED', 'BOUGHT', 'GIFTED', 'SKIP']


const nextStatus = (current: PurchaseStatus): PurchaseStatus =>
  STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length]

export function PurchasesPage() {
  const [addingItem, setAddingItem] = useState(false)
  const { data, isLoading, cycleMutation, addMutation, deleteItemMutation, deleteGroupMutation } = usePurchases()

  const { register, handleSubmit, reset, watch } = useForm<AddPurchaseForm>({
    resolver: zodResolver(addPurchaseSchema),
    defaultValues: { name: '', category: '', price: '', url: '' },
  })
  const name = watch('name')

  const onSubmit = handleSubmit((values) => {
    addMutation.mutate(
      {
        name: values.name.trim(),
        category: values.category?.trim() || 'Other',
        price: values.price ? parseFloat(values.price) : undefined,
        url: values.url?.trim() || undefined,
      },
      { onSuccess: () => { reset(); setAddingItem(false) } },
    )
  })

  const purchases = data?.data ?? []
  const meta = data?.meta
  const grouped = groupBy(purchases, (p) => p.category)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link to="/" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900 flex-1">Purchases</h1>
        {meta && (
          <span className="text-sm text-gray-500">
            {meta.bought}/{meta.total} acquired
          </span>
        )}
      </header>

      {meta && meta.total > 0 && (
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-green-500 transition-all duration-300"
            style={{ width: `${(meta.bought / meta.total) * 100}%` }}
          />
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {category}
                </h2>
                <button
                  onClick={() => deleteGroupMutation.mutate(items.map((p) => p.id))}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                  aria-label={`Delete all items in ${category}`}
                >
                  <TrashIcon />
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                {items.map((purchase) => (
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
                            ? 'line-through text-gray-400'
                            : 'text-gray-800'
                        }`}
                      >
                        {purchase.name}
                      </p>
                      {purchase.price && (
                        <p className="text-xs text-gray-400">${purchase.price.toFixed(2)}</p>
                      )}
                    </div>
                    <button
                      onClick={() =>
                        cycleMutation.mutate({ id: purchase.id, status: nextStatus(purchase.status) })
                      }
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        STATUS_COLORS[purchase.status]
                      }`}
                    >
                      {STATUS_LABELS[purchase.status]}
                    </button>
                    <button
                      onClick={() => deleteItemMutation.mutate(purchase.id)}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                      aria-label={`Delete ${purchase.name}`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {addingItem ? (
          <form
            onSubmit={onSubmit}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3"
          >
            <input
              autoFocus
              type="text"
              placeholder="Item name *"
              {...register('name')}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Category (e.g. Nursery, Feeding)"
              {...register('category')}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Price (optional)"
              {...register('price')}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!name?.trim() || addMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {addMutation.isPending ? 'Adding…' : 'Add item'}
              </button>
              <button
                type="button"
                onClick={() => { reset(); setAddingItem(false) }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingItem(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
          >
            + Add item
          </button>
        )}
      </div>
    </div>
  )
}
