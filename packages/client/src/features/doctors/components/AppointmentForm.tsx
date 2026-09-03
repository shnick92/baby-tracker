import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import type { Doctor } from '../useDoctors'
import { inputCls, errorInputCls, primaryBtnCls, secondaryBtnCls } from './formStyles'

// Local form shape: times are "HH:MM" inputs here and converted to ISO instants
// on submit, matching the visitor form.
const appointmentFormSchema = z.object({
  doctorId: z.string().min(1, 'Choose a doctor'),
  title: z.string().max(120, 'Max 120 characters').optional(),
  date: z.string().min(1, 'Date required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().max(500, 'Max 500 characters').optional(),
})
export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>

export type AppointmentPayload = {
  doctorId: string
  title?: string
  date: string
  startTime?: string
  endTime?: string
  notes?: string
}

function toISO(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString()
}

export function buildAppointmentPayload(values: AppointmentFormValues): AppointmentPayload {
  return {
    doctorId: values.doctorId,
    title: values.title?.trim() || undefined,
    date: values.date,
    startTime: values.startTime ? toISO(values.date, values.startTime) : undefined,
    endTime: values.startTime && values.endTime ? toISO(values.date, values.endTime) : undefined,
    notes: values.notes?.trim() || undefined,
  }
}

type Props = {
  doctors: Doctor[]
  defaultValues: AppointmentFormValues
  submitLabel: string
  isPending: boolean
  onSubmit: (values: AppointmentFormValues) => void
  onCancel: () => void
}

export function AppointmentForm({ doctors, defaultValues, submitLabel, isPending, onSubmit, onCancel }: Props) {
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues,
  })
  const { errors } = form.formState
  const startTime = form.watch('startTime')

  const handleStartTimeChange = (value: string) => {
    const currentEnd = form.getValues('endTime')
    if (currentEnd && currentEnd <= value) form.setValue('endTime', '')
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-blue-200 dark:border-blue-800 p-4 space-y-3"
    >
      <div>
        <select
          aria-label="Doctor"
          {...form.register('doctorId')}
          className={`${inputCls} ${errors.doctorId ? errorInputCls : ''}`}
        >
          <option value="">Choose a doctor *</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}{d.specialty ? ` · ${d.specialty}` : ''}
            </option>
          ))}
        </select>
        {errors.doctorId && <p className="text-xs text-red-500 mt-1 text-right">{errors.doctorId.message}</p>}
      </div>
      <div>
        <input
          type="text"
          placeholder="What for? (e.g. Meet & greet, 20-week scan)"
          {...form.register('title')}
          className={`${inputCls} ${errors.title ? errorInputCls : ''}`}
        />
        {errors.title && <p className="text-xs text-red-500 mt-1 text-right">{errors.title.message}</p>}
      </div>
      <div>
        <input
          type="date"
          aria-label="Date"
          {...form.register('date')}
          className={`${inputCls} ${errors.date ? errorInputCls : ''}`}
        />
        {errors.date && <p className="text-xs text-red-500 mt-1 text-right">{errors.date.message}</p>}
      </div>
      <div className="flex gap-2">
        <input
          type="time"
          aria-label="Start time"
          {...form.register('startTime', { onChange: (e) => handleStartTimeChange(e.target.value) })}
          className={`flex-1 ${inputCls} [&::-webkit-calendar-picker-indicator]:hidden`}
        />
        <span className="self-center text-gray-400 dark:text-gray-500 text-sm">to</span>
        <input
          type="time"
          aria-label="End time"
          min={startTime || undefined}
          disabled={!startTime}
          {...form.register('endTime')}
          className={`flex-1 ${inputCls} disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:hidden`}
        />
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1">Times are optional</p>
      <div>
        <input
          type="text"
          placeholder="Notes (optional)"
          {...form.register('notes')}
          className={`${inputCls} ${errors.notes ? errorInputCls : ''}`}
        />
        {errors.notes && <p className="text-xs text-red-500 mt-1 text-right">{errors.notes.message}</p>}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className={primaryBtnCls}>
          {isPending ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={secondaryBtnCls}>
          Cancel
        </button>
      </div>
    </form>
  )
}
