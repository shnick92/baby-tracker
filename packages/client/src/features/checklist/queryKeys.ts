import type { ChecklistTypeInput } from '@tracker/shared'

export const checklistKeys = {
  detail: (type: ChecklistTypeInput, babyId: string) =>
    ['checklist', type, babyId] as const,
}
