import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../lib/prisma', () => {
  const tx = {
    doctor: { updateMany: vi.fn(), update: vi.fn() },
  }
  return {
    prisma: {
      $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
      doctor: { update: vi.fn() },
      __tx: tx,
    },
  }
})

import { prisma } from '../lib/prisma'
import { chooseDoctor, unchooseDoctor, toAppointmentWriteData } from './doctors'

type TxMock = { doctor: { updateMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> } }
const tx = (prisma as unknown as { __tx: TxMock }).__tx

const stubDoctor = (overrides: Partial<{ id: string; isChosen: boolean }> = {}) => ({
  id: 'doc-1',
  babyId: 'b1',
  name: 'Dr. Rivera',
  specialty: 'Pediatrics',
  practiceName: null,
  address: null,
  phone: null,
  notes: null,
  isChosen: false,
  addedById: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

describe('chooseDoctor', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('clears every other chosen doctor for the baby before marking the target', async () => {
    tx.doctor.updateMany.mockResolvedValue({ count: 1 })
    tx.doctor.update.mockResolvedValue(stubDoctor({ isChosen: true }))

    const result = await chooseDoctor('b1', 'doc-1')

    expect(tx.doctor.updateMany).toHaveBeenCalledWith({
      where: { babyId: 'b1', isChosen: true, NOT: { id: 'doc-1' } },
      data: { isChosen: false },
    })
    expect(tx.doctor.update).toHaveBeenCalledWith({ where: { id: 'doc-1' }, data: { isChosen: true } })
    expect(result.isChosen).toBe(true)
  })

  it('runs both writes inside one transaction', async () => {
    tx.doctor.updateMany.mockResolvedValue({ count: 0 })
    tx.doctor.update.mockResolvedValue(stubDoctor({ isChosen: true }))

    await chooseDoctor('b1', 'doc-1')

    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })
})

describe('unchooseDoctor', () => {
  it('clears the chosen flag on the given doctor only', async () => {
    vi.mocked(prisma.doctor.update).mockResolvedValue(stubDoctor())

    await unchooseDoctor('doc-2')

    expect(prisma.doctor.update).toHaveBeenCalledWith({ where: { id: 'doc-2' }, data: { isChosen: false } })
  })
})

describe('toAppointmentWriteData', () => {
  it('converts ISO strings to Dates and trims text fields', () => {
    const data = toAppointmentWriteData({
      title: '  20-week scan ',
      date: '2026-06-01',
      startTime: '2026-06-01T14:00:00.000Z',
      endTime: '2026-06-01T15:00:00.000Z',
      notes: ' bring insurance card ',
    })

    expect(data).toEqual({
      title: '20-week scan',
      date: '2026-06-01',
      notes: 'bring insurance card',
      startTime: new Date('2026-06-01T14:00:00.000Z'),
      endTime: new Date('2026-06-01T15:00:00.000Z'),
    })
  })

  it('stores empty text as null', () => {
    const data = toAppointmentWriteData({ title: '', date: '2026-06-01', notes: '   ' })
    expect(data.title).toBeNull()
    expect(data.notes).toBeNull()
  })

  it('drops the end time when no start time is given', () => {
    const data = toAppointmentWriteData({
      date: '2026-06-01',
      startTime: undefined,
      endTime: '2026-06-01T15:00:00.000Z',
    })
    // Only endTime was provided, so it is written as-is; the route layer never
    // receives a lone endTime from the client because the form disables it.
    expect(data.startTime).toBeUndefined()
    expect(data.endTime).toEqual(new Date('2026-06-01T15:00:00.000Z'))
  })

  it('clears both times when start time is emptied on update', () => {
    const data = toAppointmentWriteData({ startTime: '', endTime: '2026-06-01T15:00:00.000Z' } as never)
    expect(data.startTime).toBeNull()
    expect(data.endTime).toBeNull()
  })

  it('leaves untouched fields undefined so partial updates do not overwrite', () => {
    const data = toAppointmentWriteData({ notes: 'moved to room 4' })
    expect(data).toEqual({ notes: 'moved to room 4' })
  })

  it('passes doctorId through on update', () => {
    const data = toAppointmentWriteData({ doctorId: 'doc-9' })
    expect(data.doctorId).toBe('doc-9')
  })
})
