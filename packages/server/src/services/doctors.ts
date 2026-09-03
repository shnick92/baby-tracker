import type { Prisma } from '@prisma/client'
import type { CreateAppointmentInput, UpdateAppointmentInput } from '@tracker/shared'
import { prisma } from '../lib/prisma'

// Marks one doctor as the family's chosen doctor. Only one doctor per baby can
// be chosen at a time, so every other doctor for that baby is cleared first.
export async function chooseDoctor(babyId: string, doctorId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.doctor.updateMany({
      where: { babyId, isChosen: true, NOT: { id: doctorId } },
      data: { isChosen: false },
    })
    return tx.doctor.update({ where: { id: doctorId }, data: { isChosen: true } })
  })
}

export async function unchooseDoctor(doctorId: string) {
  return prisma.doctor.update({ where: { id: doctorId }, data: { isChosen: false } })
}

// Converts a validated appointment body into Prisma write data. ISO strings
// become Dates; an explicit `null` clears a time. A cleared or absent start
// time also clears the end time so an appointment never has an end without a start.
export function toAppointmentWriteData(
  input: CreateAppointmentInput | UpdateAppointmentInput,
): Prisma.DoctorAppointmentUncheckedUpdateInput {
  const data: Prisma.DoctorAppointmentUncheckedUpdateInput = {}

  if (input.title !== undefined) data.title = input.title?.trim() || null
  if (input.date !== undefined) data.date = input.date
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null
  if ('doctorId' in input && input.doctorId !== undefined) data.doctorId = input.doctorId

  if (input.startTime !== undefined) {
    data.startTime = input.startTime ? new Date(input.startTime) : null
    data.endTime = input.startTime && input.endTime ? new Date(input.endTime) : null
  } else if (input.endTime !== undefined) {
    data.endTime = input.endTime ? new Date(input.endTime) : null
  }

  return data
}
