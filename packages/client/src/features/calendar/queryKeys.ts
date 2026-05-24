export const calendarKeys = {
  month: (babyId: string, year: number, month: number) =>
    ['calendar', babyId, year, month] as const,
}
