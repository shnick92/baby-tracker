import { useState } from 'react'
import { Check, Pencil, Trash2, ChevronDown, ChevronRight, Syringe } from 'lucide-react'

import { useAuthStore } from '@stores/authStore'
import { VACCINE_SCHEDULE, AGE_WINDOW_LABELS } from '@tracker/shared'

import { useVaccinations } from './useVaccinations'
import type { VaccinationRecord } from './useVaccinations'

const inputCls =
  'w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-400'

type DoseFormValues = {
  administeredAt: string
  lotNumber: string
  provider: string
  notes: string
}

function toLocalDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function DoseForm({ onSave, onCancel, isPending }: {
  onSave: (values: DoseFormValues) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [values, setValues] = useState<DoseFormValues>({
    administeredAt: toLocalDatetimeLocal(new Date()),
    lotNumber: '',
    provider: '',
    notes: '',
  })

  return (
    <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Date administered <span className="text-red-400">*</span></label>
        <input type="datetime-local" value={values.administeredAt} onChange={(e) => setValues((v) => ({ ...v, administeredAt: e.target.value }))}
          className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Lot number <span className="text-gray-400">(optional)</span></label>
          <input type="text" value={values.lotNumber} onChange={(e) => setValues((v) => ({ ...v, lotNumber: e.target.value }))}
            placeholder="e.g. AB123456" className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Provider <span className="text-gray-400">(optional)</span></label>
          <input type="text" value={values.provider} onChange={(e) => setValues((v) => ({ ...v, provider: e.target.value }))}
            placeholder="e.g. Dr. Smith" className={inputCls} />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Notes <span className="text-gray-400">(optional)</span></label>
        <input type="text" value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          placeholder="Any reactions or notes" className={inputCls} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => onSave(values)} disabled={isPending}
          className="flex-1 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-semibold disabled:opacity-50">
          {isPending ? 'Saving…' : 'Record Dose'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300">
          Cancel
        </button>
      </div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
        This is an informal record — not an official medical document.
      </p>
    </div>
  )
}

function AgeGroup({ label, vaccines, records, onLog, onEdit, onDelete, isPending, defaultOpen }: {
  label: string
  vaccines: typeof VACCINE_SCHEDULE
  records: VaccinationRecord[]
  onLog: (key: string, values: DoseFormValues) => void
  onEdit: (id: string, values: DoseFormValues) => void
  onDelete: (id: string) => void
  isPending: boolean
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [loggingKey, setLoggingKey] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const administeredKeys = new Set(records.map((r) => r.vaccineKey))
  const adminCount = vaccines.filter((v) => administeredKeys.has(v.key)).length

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <span className="text-lg">💉</span>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{adminCount} of {vaccines.length} administered</p>
        </div>
        <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-violet-400 rounded-full transition-all"
            style={{ width: vaccines.length > 0 ? `${(adminCount / vaccines.length) * 100}%` : '0%' }} />
        </div>
        {open ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {vaccines.map((vaccine) => {
            const record = records.find((r) => r.vaccineKey === vaccine.key)
            const isAdministered = !!record
            const isLogging = loggingKey === vaccine.key
            const isEditing = record && editingId === record.id

            return (
              <div key={vaccine.key} className={`border-b border-gray-50 dark:border-gray-700 last:border-b-0 ${isAdministered ? 'bg-violet-50/30 dark:bg-violet-900/10' : ''}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    isAdministered ? 'bg-violet-500 text-white' : 'border-2 border-gray-200 dark:border-gray-600'
                  }`}>
                    {isAdministered && <Check size={12} strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isAdministered ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
                      {vaccine.name}
                      {vaccine.doseNumber > 1 && <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">(Dose {vaccine.doseNumber})</span>}
                    </p>
                    {isAdministered && record && (
                      <p className="text-[11px] text-violet-600 dark:text-violet-400">
                        ✓ {new Date(record.administeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {record.provider && ` · ${record.provider}`}
                      </p>
                    )}
                  </div>
                  {isAdministered && record ? (
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => { setEditingId(record.id); setLoggingKey(null) }}
                        className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-blue-400 transition-colors" aria-label="Edit">
                        <Pencil size={14} />
                      </button>
                      <button type="button" onClick={() => onDelete(record.id)}
                        className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors" aria-label="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setLoggingKey(isLogging ? null : vaccine.key); setEditingId(null) }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-medium hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors">
                      Log
                    </button>
                  )}
                </div>

                {isLogging && (
                  <DoseForm
                    onSave={(values) => { onLog(vaccine.key, values); setLoggingKey(null) }}
                    onCancel={() => setLoggingKey(null)}
                    isPending={isPending}
                  />
                )}

                {isEditing && record && (
                  <DoseForm
                    onSave={(values) => { onEdit(record.id, values); setEditingId(null) }}
                    onCancel={() => setEditingId(null)}
                    isPending={isPending}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function VaccinationsPage() {
  const { babyId } = useAuthStore()
  const { records, isLoading, logMutation, editMutation, deleteMutation } = useVaccinations(babyId!)

  const handleLog = (vaccineKey: string, values: DoseFormValues) => {
    logMutation.mutate({
      vaccineKey,
      administeredAt: new Date(values.administeredAt).toISOString(),
      lotNumber: values.lotNumber || undefined,
      provider: values.provider || undefined,
      notes: values.notes || undefined,
    })
  }

  const handleEdit = (id: string, values: DoseFormValues) => {
    editMutation.mutate({
      id,
      administeredAt: new Date(values.administeredAt).toISOString(),
      lotNumber: values.lotNumber || null,
      provider: values.provider || null,
      notes: values.notes || null,
    })
  }

  const totalAdministered = records.length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Vaccinations</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">{totalAdministered} doses recorded</p>
        </div>
        <Syringe size={20} className="text-violet-400" />
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 md:max-w-5xl md:px-6">

        {/* Disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl px-4 py-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            ⚠️ This is an informal record for your reference only — not an official medical document. Keep your doctor's official vaccination record as your primary source.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : (
          AGE_WINDOW_LABELS.map(({ label, months }, i) => {
            const vaccines = VACCINE_SCHEDULE.filter(
              (v) => v.ageWindowMonths[0] === months[0] && v.ageWindowMonths[1] === months[1]
            )
            if (vaccines.length === 0) return null
            const groupRecords = records.filter((r) => vaccines.some((v) => v.key === r.vaccineKey))
            return (
              <AgeGroup
                key={label}
                label={label}
                vaccines={vaccines}
                records={groupRecords}
                onLog={handleLog}
                onEdit={handleEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
                isPending={logMutation.isPending || editMutation.isPending}
                defaultOpen={i < 2}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
