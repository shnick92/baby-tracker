// CDC developmental milestones for 0–6 months.
// These are seeded via GET /api/milestones?babyId= on first load if no milestones exist.

export type MilestoneCategoryKey =
  | 'MOTOR_GROSS'
  | 'MOTOR_FINE'
  | 'SOCIAL'
  | 'LANGUAGE'
  | 'COGNITIVE'
  | 'FEEDING'

export interface MilestoneTemplate {
  category: MilestoneCategoryKey
  label: string
  ageMonths: number // typical achievement age in months
}

export const CDC_MILESTONES: MilestoneTemplate[] = [
  // 1 month
  { category: 'MOTOR_GROSS', label: 'Lifts head briefly when on tummy', ageMonths: 1 },
  { category: 'SOCIAL', label: 'Looks at your face', ageMonths: 1 },
  { category: 'SOCIAL', label: 'Seems calmer when spoken to or picked up', ageMonths: 1 },
  { category: 'LANGUAGE', label: 'Makes sounds other than crying', ageMonths: 1 },
  { category: 'LANGUAGE', label: 'Reacts to loud sounds', ageMonths: 1 },

  // 2 months
  { category: 'SOCIAL', label: 'Smiles when you talk or smile (social smile)', ageMonths: 2 },
  { category: 'SOCIAL', label: 'Looks at you for a few seconds', ageMonths: 2 },
  { category: 'MOTOR_GROSS', label: 'Holds head up when on tummy', ageMonths: 2 },
  { category: 'MOTOR_GROSS', label: 'Makes smoother movements with arms and legs', ageMonths: 2 },
  { category: 'LANGUAGE', label: 'Makes sounds like "ooh" and "aah" (cooing)', ageMonths: 2 },
  { category: 'LANGUAGE', label: 'Quiets or smiles in response to your voice', ageMonths: 2 },
  { category: 'COGNITIVE', label: 'Watches you as you move', ageMonths: 2 },

  // 4 months
  { category: 'SOCIAL', label: 'Smiles on their own to get your attention', ageMonths: 4 },
  { category: 'SOCIAL', label: 'Makes sounds back when you talk to them', ageMonths: 4 },
  { category: 'SOCIAL', label: 'Enjoys playing with people', ageMonths: 4 },
  { category: 'MOTOR_GROSS', label: 'Holds head steady and unsupported', ageMonths: 4 },
  { category: 'MOTOR_GROSS', label: 'Pushes up on elbows/forearms when on tummy', ageMonths: 4 },
  { category: 'MOTOR_FINE', label: 'Brings hands to mouth', ageMonths: 4 },
  { category: 'MOTOR_FINE', label: 'Reaches for toys with one hand', ageMonths: 4 },
  { category: 'LANGUAGE', label: 'Makes sounds like "mmmm" (babbling)', ageMonths: 4 },
  { category: 'LANGUAGE', label: 'Laughs', ageMonths: 4 },
  { category: 'COGNITIVE', label: 'Looks at a toy for several seconds', ageMonths: 4 },

  // 6 months
  { category: 'SOCIAL', label: 'Knows familiar people', ageMonths: 6 },
  { category: 'SOCIAL', label: 'Likes to look at self in mirror', ageMonths: 6 },
  { category: 'SOCIAL', label: 'Laughs', ageMonths: 6 },
  { category: 'MOTOR_GROSS', label: 'Rolls from tummy to back', ageMonths: 6 },
  { category: 'MOTOR_GROSS', label: 'Pushes up to straight arms on tummy', ageMonths: 6 },
  { category: 'MOTOR_GROSS', label: 'Leans on hands when sitting', ageMonths: 6 },
  { category: 'MOTOR_FINE', label: 'Passes a toy from one hand to the other', ageMonths: 6 },
  { category: 'LANGUAGE', label: 'Takes turns making sounds with you', ageMonths: 6 },
  { category: 'LANGUAGE', label: 'Blows raspberries', ageMonths: 6 },
  { category: 'LANGUAGE', label: 'Makes squealing noises', ageMonths: 6 },
  { category: 'COGNITIVE', label: 'Reaches to grab a toy', ageMonths: 6 },
  { category: 'COGNITIVE', label: 'Puts things in mouth', ageMonths: 6 },
  { category: 'FEEDING', label: 'Shows interest in solid foods when offered', ageMonths: 6 },
]

export const MILESTONE_CATEGORY_LABELS: Record<MilestoneCategoryKey | 'CUSTOM', string> = {
  MOTOR_GROSS: 'Gross Motor',
  MOTOR_FINE: 'Fine Motor',
  SOCIAL: 'Social & Emotional',
  LANGUAGE: 'Language & Communication',
  COGNITIVE: 'Cognitive',
  FEEDING: 'Feeding',
  CUSTOM: 'Custom',
}
