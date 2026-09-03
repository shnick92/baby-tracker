import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createDoctorSchema, type CreateDoctorInput } from '@tracker/shared'

import { inputCls, errorInputCls, primaryBtnCls, secondaryBtnCls } from './formStyles'

type Props = {
  defaultValues?: CreateDoctorInput
  submitLabel: string
  isPending: boolean
  onSubmit: (values: CreateDoctorInput) => void
  onCancel: () => void
}

const EMPTY: CreateDoctorInput = { name: '', specialty: '', practiceName: '', address: '', phone: '', notes: '' }

export function DoctorForm({ defaultValues, submitLabel, isPending, onSubmit, onCancel }: Props) {
  const form = useForm<CreateDoctorInput>({
    resolver: zodResolver(createDoctorSchema),
    defaultValues: defaultValues ?? EMPTY,
  })
  const { errors } = form.formState

  const field = (name: keyof CreateDoctorInput, placeholder: string, extra: Record<string, unknown> = {}) => (
    <div>
      <input
        type="text"
        placeholder={placeholder}
        {...extra}
        {...form.register(name)}
        className={`${inputCls} ${errors[name] ? errorInputCls : ''}`}
      />
      {errors[name] && <p className="text-xs text-red-500 mt-1 text-right">{errors[name]?.message}</p>}
    </div>
  )

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-blue-200 dark:border-blue-800 p-4 space-y-3"
    >
      {field('name', 'Doctor name *', { autoFocus: true })}
      {field('specialty', 'Specialty (e.g. Pediatrician, OB-GYN)')}
      {field('practiceName', 'Practice or clinic name')}
      {field('address', 'Address')}
      {field('phone', 'Phone', { type: 'tel', inputMode: 'tel' })}
      {field('notes', 'Notes (optional)')}
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
