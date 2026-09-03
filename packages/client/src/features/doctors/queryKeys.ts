export const doctorKeys = {
  list: (babyId: string) => ['doctors', babyId] as const,
  appointments: (babyId: string) => ['doctors', babyId, 'appointments'] as const,
}
