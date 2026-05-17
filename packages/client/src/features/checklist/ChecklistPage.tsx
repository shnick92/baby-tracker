import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { groupBy } from '@lib/utils/groupBy'
import type { ChecklistTypeInput } from '@tracker/shared'

import { useChecklist } from './useChecklist'

const addItemSchema = z.object({
  label: z.string().min(1, 'Required'),
  category: z.string().optional(),
})
type AddItemForm = z.infer<typeof addItemSchema>


const TABS: { type: ChecklistTypeInput; label: string }[] = [
  { type: 'HOSPITAL_BAG_MOM', label: "Mom's Bag" },
  { type: 'HOSPITAL_BAG_BABY', label: "Baby's Bag" },
  { type: 'HOME_PREP', label: 'Home Prep' },
  { type: 'BEFORE_HOME', label: 'Before Home' },
]

const TYPE_LABELS: Record<string, string> = {
  HOSPITAL_BAG_MOM: 'Hospital Bag — Mom',
  HOSPITAL_BAG_BABY: 'Hospital Bag — Baby',
  HOME_PREP: 'Home Prep',
  BEFORE_HOME: 'Before We Get Home',
}


export function ChecklistPage() {
  const { type: typeParam } = useParams<{ type: string }>()
  const activeType = (typeParam?.toUpperCase() ?? 'HOSPITAL_BAG_MOM') as ChecklistTypeInput
  const [addingItem, setAddingItem] = useState(false)

  const { data, isLoading, toggleMutation, addMutation } = useChecklist(activeType)

  const { register, handleSubmit, reset, watch } = useForm<AddItemForm>({
    resolver: zodResolver(addItemSchema),
    defaultValues: { label: '', category: '' },
  })
  const label = watch('label')

  const onSubmit = handleSubmit((values) => {
    addMutation.mutate(
      { label: values.label.trim(), category: values.category?.trim() ?? '' },
      { onSuccess: () => { reset(); setAddingItem(false) } },
    )
  })

  const items = data?.items ?? []
  const checked = items.filter((i) => i.isChecked).length
  const grouped = groupBy(items, (item) => item.category)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link to="/" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900 flex-1">
          {TYPE_LABELS[activeType] ?? activeType}
        </h1>
        <span className="text-sm text-gray-500">
          {checked}/{items.length}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-1 bg-blue-500 transition-all duration-300"
          style={{ width: items.length ? `${(checked / items.length) * 100}%` : '0%' }}
        />
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 flex overflow-x-auto">
        {TABS.map((tab) => (
          <Link
            key={tab.type}
            to={`/checklist/${tab.type.toLowerCase()}`}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeType === tab.type
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          Object.entries(grouped).map(([category, catItems]) => (
            <div key={category}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                {category}
              </h2>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                {catItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={item.isChecked}
                      onChange={(e) =>
                        toggleMutation.mutate({ itemId: item.id, isChecked: e.target.checked })
                      }
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className={`flex-1 text-sm leading-snug ${
                        item.isChecked ? 'line-through text-gray-400' : 'text-gray-800'
                      }`}
                    >
                      {item.label}
                    </span>
                  </label>
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
              placeholder="Item name"
              {...register('label')}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Category (optional)"
              {...register('category')}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!label?.trim() || addMutation.isPending}
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
            + Add custom item
          </button>
        )}
      </div>
    </div>
  )
}
