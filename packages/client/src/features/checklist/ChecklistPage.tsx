import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { groupBy } from '@lib/utils/groupBy'
import { formatDueMonthYear } from '@lib/utils/formatDate'
import type { ChecklistTypeInput } from '@tracker/shared'
import { usePregnancyStatus } from '@features/pregnancy'

import { useChecklist } from './useChecklist'
import { ChecklistSkeleton } from './ChecklistSkeleton'

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
  const { data: pregnancy } = usePregnancyStatus()

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<AddItemForm>({
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile-only header — AppLayout sidebar replaces this on tablet */}
      <header className="sticky top-0 z-10 md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">
            {TYPE_LABELS[activeType] ?? activeType}
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {pregnancy?.weeksPregnant && pregnancy?.dueDate
              ? `Week ${pregnancy.weeksPregnant} · Due ${formatDueMonthYear(pregnancy.dueDate)}`
              : ''}
          </p>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 dark:bg-gray-700">
        <div
          className="h-1 bg-blue-500 transition-all duration-300"
          style={{ width: items.length ? `${(checked / items.length) * 100}%` : '0%' }}
        />
      </div>

      {/* Tab bar — horizontal scroll at all sizes */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex overflow-x-auto">
        {TABS.map((tab) => (
          <Link
            key={tab.type}
            to={`/checklist/${tab.type.toLowerCase()}`}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeType === tab.type
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 md:max-w-2xl md:px-8">
        {isLoading ? (
          <ChecklistSkeleton />
        ) : (
          <>
            {/* Progress summary card */}
            {items.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-4 py-3.5">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{checked}/{items.length}</span>
                  <span className="text-sm text-gray-400 dark:text-gray-500">items packed</span>
                  {checked === items.length && (
                    <span className="ml-auto text-xs font-semibold text-green-600 dark:text-green-400">All done ✓</span>
                  )}
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                    style={{ width: `${(checked / items.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {Object.entries(grouped).map(([category, catItems]) => (
              <div key={category}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                  {category}
                </h2>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
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
                        className="w-5 h-5 rounded border-gray-300 dark:border-gray-500 text-blue-600 focus:ring-blue-500"
                      />
                      <span
                        className={`flex-1 text-sm leading-snug ${
                          item.isChecked ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-800 dark:text-gray-100'
                        }`}
                      >
                        {item.label}
                      </span>
                      {!item.isChecked && (
                        <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                          Needed
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {addingItem ? (
          <form
            onSubmit={onSubmit}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3"
          >
            <div>
              <input
                autoFocus
                type="text"
                placeholder="Item name"
                {...register('label')}
                className={`w-full rounded-xl border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${errors.label ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'}`}
              />
              {errors.label && (
                <p className="text-xs text-red-500 mt-1 text-right">{errors.label.message}</p>
              )}
            </div>
            <input
              type="text"
              placeholder="Category (optional)"
              {...register('category')}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            + Add custom item
          </button>
        )}
      </div>
    </div>
  )
}
