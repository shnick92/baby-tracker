import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateDoctorInput, UpdateDoctorInput, CreateAppointmentInput, UpdateAppointmentInput } from '@tracker/shared'

import { api } from '@lib/axios'
import { getSocket } from '@lib/socket'
import { useAuthStore } from '@stores/authStore'

import { doctorKeys } from './queryKeys'

export type Doctor = {
  id: string
  name: string
  specialty: string | null
  practiceName: string | null
  address: string | null
  phone: string | null
  notes: string | null
  isChosen: boolean
  addedById: string
  _count: { appointments: number }
}

export type DoctorAppointment = {
  id: string
  doctorId: string
  title: string | null
  date: string
  startTime: string | null
  endTime: string | null
  notes: string | null
  doctor: { id: string; name: string; practiceName: string | null; address: string | null }
}

export function useDoctors() {
  const babyId = useAuthStore((s) => s.babyId) ?? ''
  const queryClient = useQueryClient()

  const doctorsQuery = useQuery({
    queryKey: doctorKeys.list(babyId),
    queryFn: () =>
      api.get<{ data: Doctor[] }>('/api/doctors', { params: { babyId } }).then((r) => r.data.data),
    enabled: !!babyId,
  })

  const appointmentsQuery = useQuery({
    queryKey: doctorKeys.appointments(babyId),
    queryFn: () =>
      api
        .get<{ data: DoctorAppointment[] }>('/api/doctors/appointments', { params: { babyId } })
        .then((r) => r.data.data),
    enabled: !!babyId,
  })

  const invalidate = (bid: string) => {
    queryClient.invalidateQueries({ queryKey: doctorKeys.list(bid) })
    // Appointments also feed the calendar month grid and the daily history panel.
    queryClient.invalidateQueries({ queryKey: ['calendar', bid] })
    queryClient.invalidateQueries({ queryKey: ['history', 'daily', bid] })
  }

  useEffect(() => {
    const socket = getSocket()
    const handler = ({ babyId: bid }: { babyId: string }) => invalidate(bid)
    socket.on('doctors:updated', handler)
    return () => { socket.off('doctors:updated', handler) }
  }, [queryClient])

  const onSuccess = () => invalidate(babyId)

  const addDoctor = useMutation({
    mutationFn: (input: CreateDoctorInput) => api.post('/api/doctors', input, { params: { babyId } }),
    onSuccess,
  })

  const editDoctor = useMutation({
    mutationFn: ({ id, ...data }: UpdateDoctorInput & { id: string }) => api.patch(`/api/doctors/${id}`, data),
    onSuccess,
  })

  const deleteDoctor = useMutation({
    mutationFn: (id: string) => api.delete(`/api/doctors/${id}`),
    onSuccess,
  })

  const chooseDoctor = useMutation({
    mutationFn: ({ id, chosen }: { id: string; chosen: boolean }) =>
      chosen ? api.post(`/api/doctors/${id}/choose`) : api.delete(`/api/doctors/${id}/choose`),
    onSuccess,
  })

  const addAppointment = useMutation({
    mutationFn: ({ doctorId, ...data }: CreateAppointmentInput & { doctorId: string }) =>
      api.post(`/api/doctors/${doctorId}/appointments`, data),
    onSuccess,
  })

  const editAppointment = useMutation({
    mutationFn: ({ id, ...data }: UpdateAppointmentInput & { id: string }) =>
      api.patch(`/api/doctors/appointments/${id}`, data),
    onSuccess,
  })

  const deleteAppointment = useMutation({
    mutationFn: (id: string) => api.delete(`/api/doctors/appointments/${id}`),
    onSuccess,
  })

  return {
    doctors: doctorsQuery.data ?? [],
    appointments: appointmentsQuery.data ?? [],
    isLoading: doctorsQuery.isLoading || appointmentsQuery.isLoading,
    addDoctor,
    editDoctor,
    deleteDoctor,
    chooseDoctor,
    addAppointment,
    editAppointment,
    deleteAppointment,
  }
}
