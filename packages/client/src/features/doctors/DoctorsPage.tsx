import { useState } from 'react'

import { todayDateString, extractTimeInput } from '@lib/utils/localDate'

import { useDoctors, type Doctor, type DoctorAppointment } from './useDoctors'
import { DoctorsSkeleton } from './DoctorsSkeleton'
import { DoctorCard } from './components/DoctorCard'
import { DoctorForm } from './components/DoctorForm'
import { AppointmentRow } from './components/AppointmentRow'
import { AppointmentForm, buildAppointmentPayload, type AppointmentFormValues } from './components/AppointmentForm'

const dashedBtnCls =
  'w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:text-gray-400'

type AppointmentDraft =
  | { mode: 'add'; doctorId: string }
  | { mode: 'edit'; appointment: DoctorAppointment }

function appointmentDefaults(draft: AppointmentDraft): AppointmentFormValues {
  if (draft.mode === 'add') {
    return { doctorId: draft.doctorId, title: '', date: '', startTime: '', endTime: '', notes: '' }
  }
  const a = draft.appointment
  return {
    doctorId: a.doctorId,
    title: a.title ?? '',
    date: a.date,
    startTime: extractTimeInput(a.startTime),
    endTime: extractTimeInput(a.endTime),
    notes: a.notes ?? '',
  }
}

export function DoctorsPage() {
  const {
    doctors, appointments, isLoading,
    addDoctor, editDoctor, deleteDoctor, chooseDoctor,
    addAppointment, editAppointment, deleteAppointment,
  } = useDoctors()

  const [addingDoctor, setAddingDoctor] = useState(false)
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null)
  const [appointmentDraft, setAppointmentDraft] = useState<AppointmentDraft | null>(null)
  const [showPast, setShowPast] = useState(false)

  const today = todayDateString()
  const chosen = doctors.find((d) => d.isChosen)
  const upcoming = appointments.filter((a) => a.date >= today)
  const past = appointments.filter((a) => a.date < today).reverse()

  const handleSubmitAppointment = (values: AppointmentFormValues) => {
    const payload = buildAppointmentPayload(values)
    if (appointmentDraft?.mode === 'edit') {
      editAppointment.mutate(
        { id: appointmentDraft.appointment.id, ...payload },
        { onSuccess: () => setAppointmentDraft(null) },
      )
    } else {
      addAppointment.mutate(payload, { onSuccess: () => setAppointmentDraft(null) })
    }
  }

  const appointmentForm = appointmentDraft && (
    <AppointmentForm
      key={appointmentDraft.mode === 'edit' ? appointmentDraft.appointment.id : `add-${appointmentDraft.doctorId}`}
      doctors={doctors}
      defaultValues={appointmentDefaults(appointmentDraft)}
      submitLabel={appointmentDraft.mode === 'edit' ? 'Save' : 'Save appointment'}
      isPending={addAppointment.isPending || editAppointment.isPending}
      onSubmit={handleSubmitAppointment}
      onCancel={() => setAppointmentDraft(null)}
    />
  )

  const renderAppointment = (a: DoctorAppointment) =>
    appointmentDraft?.mode === 'edit' && appointmentDraft.appointment.id === a.id ? (
      <div key={a.id}>{appointmentForm}</div>
    ) : (
      <AppointmentRow
        key={a.id}
        appointment={a}
        isToday={a.date === today}
        isPast={a.date < today}
        onEdit={() => setAppointmentDraft({ mode: 'edit', appointment: a })}
        onDelete={() => deleteAppointment.mutate(a.id)}
      />
    )

  const renderDoctor = (d: Doctor) =>
    editingDoctorId === d.id ? (
      <DoctorForm
        key={d.id}
        defaultValues={{
          name: d.name,
          specialty: d.specialty ?? '',
          practiceName: d.practiceName ?? '',
          address: d.address ?? '',
          phone: d.phone ?? '',
          notes: d.notes ?? '',
        }}
        submitLabel="Save"
        isPending={editDoctor.isPending}
        onSubmit={(values) => editDoctor.mutate({ id: d.id, ...values }, { onSuccess: () => setEditingDoctorId(null) })}
        onCancel={() => setEditingDoctorId(null)}
      />
    ) : (
      <DoctorCard
        key={d.id}
        doctor={d}
        onChoose={(isChosen) => chooseDoctor.mutate({ id: d.id, chosen: isChosen })}
        onSchedule={() => setAppointmentDraft({ mode: 'add', doctorId: d.id })}
        onEdit={() => setEditingDoctorId(d.id)}
        onDelete={() => deleteDoctor.mutate(d.id)}
      />
    )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 md:hidden bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">Doctors</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {chosen ? `Our doctor · ${chosen.name}` : 'Candidates & appointments'}
        </p>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6 md:max-w-3xl md:px-8">
        {isLoading ? (
          <DoctorsSkeleton />
        ) : (
          <>
            {/* ── Appointments ─────────────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Upcoming appointments
                </h2>
                {past.length > 0 && (
                  <button
                    onClick={() => setShowPast((v) => !v)}
                    className="text-xs text-blue-500 dark:text-blue-400"
                  >
                    {showPast ? 'Hide past' : `Show past (${past.length})`}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {upcoming.length === 0 && appointmentDraft?.mode !== 'add' && (
                  <div className="text-center py-6 text-gray-400 dark:text-gray-600 text-sm">
                    {doctors.length === 0 ? 'Add a doctor below to schedule an appointment' : 'No upcoming appointments'}
                  </div>
                )}
                {upcoming.map(renderAppointment)}
                {appointmentDraft?.mode === 'add' && appointmentForm}
                {appointmentDraft?.mode !== 'add' && (
                  <button
                    onClick={() => setAppointmentDraft({ mode: 'add', doctorId: chosen?.id ?? '' })}
                    disabled={doctors.length === 0}
                    className={dashedBtnCls}
                  >
                    + Schedule an appointment
                  </button>
                )}
              </div>
              {showPast && past.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">Past</h3>
                  <div className="space-y-2">{past.map(renderAppointment)}</div>
                </div>
              )}
            </section>

            {/* ── Doctors ──────────────────────────────────────────────── */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
                Doctors
              </h2>
              {doctors.length === 0 && !addingDoctor && (
                <div className="text-center py-6 text-gray-400 dark:text-gray-600 text-sm">
                  No doctors added yet — add the ones you're considering
                </div>
              )}
              <div className="space-y-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                {doctors.map(renderDoctor)}
              </div>
              <div className="mt-3">
                {addingDoctor ? (
                  <DoctorForm
                    submitLabel="Add doctor"
                    isPending={addDoctor.isPending}
                    onSubmit={(values) => addDoctor.mutate(values, { onSuccess: () => setAddingDoctor(false) })}
                    onCancel={() => setAddingDoctor(false)}
                  />
                ) : (
                  <button onClick={() => setAddingDoctor(true)} className={dashedBtnCls}>
                    + Add a doctor
                  </button>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
