export type SuggestedQuestion = {
  text: string
  source?: string
}

type AgeGroup = {
  minWeeks: number
  maxWeeks: number
  questions: SuggestedQuestion[]
}

const AGE_GROUPS: AgeGroup[] = [
  {
    minWeeks: -Infinity,
    maxWeeks: 0,
    questions: [
      { text: 'What should be in our hospital bag?', source: 'AAP' },
      { text: 'How do we set up a safe sleep environment?', source: 'AAP' },
      { text: 'What newborn supplies do we actually need?', source: 'AAP' },
      { text: 'When should we install the car seat?', source: 'NHTSA' },
    ],
  },
  {
    minWeeks: 0,
    maxWeeks: 2,
    questions: [
      { text: 'How often should a newborn feed?', source: 'AAP' },
      { text: 'How many wet diapers should we see each day?', source: 'AAP' },
      { text: 'Is it normal for the baby to lose weight after birth?', source: 'AAP' },
      { text: 'When should we call the pediatrician?', source: 'AAP' },
    ],
  },
  {
    minWeeks: 2,
    maxWeeks: 6,
    questions: [
      { text: 'Is cluster feeding normal right now?', source: 'La Leche League' },
      { text: 'How long should each nap be at this age?', source: 'AAP' },
      { text: 'Is it normal to still have this many dirty diapers?', source: 'AAP' },
      { text: 'What should tummy time look like at 3 weeks?', source: 'AAP' },
    ],
  },
  {
    minWeeks: 6,
    maxWeeks: 12,
    questions: [
      { text: 'Are longer stretches between feedings normal now?', source: 'AAP' },
      { text: 'When should the baby start smiling?', source: 'CDC' },
      { text: 'How much total sleep should a 2-month-old get?', source: 'AAP' },
      { text: 'Is it safe to let them sleep a longer stretch at night?', source: 'AAP' },
    ],
  },
  {
    minWeeks: 12,
    maxWeeks: 20,
    questions: [
      { text: 'What is the 4-month sleep regression?', source: 'AAP' },
      { text: 'How long should tummy time be at this age?', source: 'AAP' },
      { text: 'Is the feeding pattern changing at 3 months normal?', source: 'La Leche League' },
      { text: 'When do babies start laughing?', source: 'CDC' },
    ],
  },
  {
    minWeeks: 20,
    maxWeeks: 28,
    questions: [
      { text: 'When can we start introducing solids?', source: 'AAP' },
      { text: 'Is drooling and chewing a sign of teething?', source: 'AAP' },
      { text: 'How do I know if the baby is getting enough milk?', source: 'La Leche League' },
      { text: 'What milestones should we look for around 5 months?', source: 'CDC' },
    ],
  },
  {
    minWeeks: 28,
    maxWeeks: 40,
    questions: [
      { text: 'What finger foods are safe to start with?', source: 'AAP' },
      { text: 'Is the baby on track with crawling?', source: 'CDC' },
      { text: 'How do we handle separation anxiety?', source: 'AAP' },
      { text: 'How much water can a 7-month-old have?', source: 'AAP' },
    ],
  },
  {
    minWeeks: 40,
    maxWeeks: Infinity,
    questions: [
      { text: 'When should the baby start walking?', source: 'CDC' },
      { text: 'Is now a good time to think about weaning?', source: 'WHO' },
      { text: 'What table foods are safe at this age?', source: 'AAP' },
      { text: 'When should we schedule the 1-year check-up?', source: 'AAP' },
    ],
  },
]

export function getSuggestedQuestions(birthDate: string | null): SuggestedQuestion[] {
  if (!birthDate) return AGE_GROUPS[0].questions

  const ageWeeks = (Date.now() - new Date(birthDate).getTime()) / (7 * 24 * 60 * 60 * 1000)
  const group = AGE_GROUPS.find((g) => ageWeeks >= g.minWeeks && ageWeeks < g.maxWeeks)
  return (group ?? AGE_GROUPS[AGE_GROUPS.length - 1]).questions
}
