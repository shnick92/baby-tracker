// CDC-recommended immunization schedule for children 0–18 months (2024 edition).
// vaccineKey is used as a stable identifier in VaccinationRecord.vaccineKey.

export interface VaccineEntry {
  key: string
  name: string
  doseNumber: number
  recommendedAge: string
  ageWindowMonths: [number, number] // [earliest, latest] in months for grouping
}

export const VACCINE_SCHEDULE: VaccineEntry[] = [
  // HepB — Hepatitis B
  { key: 'hepb-1', name: 'Hepatitis B (HepB)', doseNumber: 1, recommendedAge: 'Birth', ageWindowMonths: [0, 0] },
  { key: 'hepb-2', name: 'Hepatitis B (HepB)', doseNumber: 2, recommendedAge: '1–2 months', ageWindowMonths: [1, 2] },
  { key: 'hepb-3', name: 'Hepatitis B (HepB)', doseNumber: 3, recommendedAge: '6–18 months', ageWindowMonths: [6, 18] },

  // RV — Rotavirus
  { key: 'rv-1', name: 'Rotavirus (RV)', doseNumber: 1, recommendedAge: '2 months', ageWindowMonths: [2, 2] },
  { key: 'rv-2', name: 'Rotavirus (RV)', doseNumber: 2, recommendedAge: '4 months', ageWindowMonths: [4, 4] },
  { key: 'rv-3', name: 'Rotavirus (RV)', doseNumber: 3, recommendedAge: '6 months', ageWindowMonths: [6, 6] },

  // DTaP — Diphtheria, Tetanus, Pertussis
  { key: 'dtap-1', name: 'DTaP', doseNumber: 1, recommendedAge: '2 months', ageWindowMonths: [2, 2] },
  { key: 'dtap-2', name: 'DTaP', doseNumber: 2, recommendedAge: '4 months', ageWindowMonths: [4, 4] },
  { key: 'dtap-3', name: 'DTaP', doseNumber: 3, recommendedAge: '6 months', ageWindowMonths: [6, 6] },
  { key: 'dtap-4', name: 'DTaP', doseNumber: 4, recommendedAge: '15–18 months', ageWindowMonths: [15, 18] },

  // Hib — Haemophilus influenzae type b
  { key: 'hib-1', name: 'Hib', doseNumber: 1, recommendedAge: '2 months', ageWindowMonths: [2, 2] },
  { key: 'hib-2', name: 'Hib', doseNumber: 2, recommendedAge: '4 months', ageWindowMonths: [4, 4] },
  { key: 'hib-3', name: 'Hib', doseNumber: 3, recommendedAge: '6 months', ageWindowMonths: [6, 6] },
  { key: 'hib-4', name: 'Hib', doseNumber: 4, recommendedAge: '12–15 months', ageWindowMonths: [12, 15] },

  // PCV — Pneumococcal conjugate vaccine
  { key: 'pcv-1', name: 'PCV15/PCV20', doseNumber: 1, recommendedAge: '2 months', ageWindowMonths: [2, 2] },
  { key: 'pcv-2', name: 'PCV15/PCV20', doseNumber: 2, recommendedAge: '4 months', ageWindowMonths: [4, 4] },
  { key: 'pcv-3', name: 'PCV15/PCV20', doseNumber: 3, recommendedAge: '6 months', ageWindowMonths: [6, 6] },
  { key: 'pcv-4', name: 'PCV15/PCV20', doseNumber: 4, recommendedAge: '12–15 months', ageWindowMonths: [12, 15] },

  // IPV — Inactivated Poliovirus
  { key: 'ipv-1', name: 'Polio (IPV)', doseNumber: 1, recommendedAge: '2 months', ageWindowMonths: [2, 2] },
  { key: 'ipv-2', name: 'Polio (IPV)', doseNumber: 2, recommendedAge: '4 months', ageWindowMonths: [4, 4] },
  { key: 'ipv-3', name: 'Polio (IPV)', doseNumber: 3, recommendedAge: '6–18 months', ageWindowMonths: [6, 18] },

  // COVID-19
  { key: 'covid-1', name: 'COVID-19', doseNumber: 1, recommendedAge: '6 months+', ageWindowMonths: [6, 18] },
  { key: 'covid-2', name: 'COVID-19', doseNumber: 2, recommendedAge: '6 months+', ageWindowMonths: [6, 18] },

  // Influenza — annual starting at 6 months
  { key: 'flu-1', name: 'Influenza (annual)', doseNumber: 1, recommendedAge: '6 months+', ageWindowMonths: [6, 18] },

  // MMR — Measles, Mumps, Rubella
  { key: 'mmr-1', name: 'MMR', doseNumber: 1, recommendedAge: '12–15 months', ageWindowMonths: [12, 15] },

  // Varicella
  { key: 'varicella-1', name: 'Varicella', doseNumber: 1, recommendedAge: '12–15 months', ageWindowMonths: [12, 15] },

  // HepA — Hepatitis A
  { key: 'hepa-1', name: 'Hepatitis A (HepA)', doseNumber: 1, recommendedAge: '12–23 months', ageWindowMonths: [12, 23] },
]

// Age window labels used for grouping in the UI
export const AGE_WINDOW_LABELS: { label: string; months: [number, number] }[] = [
  { label: 'Birth', months: [0, 0] },
  { label: '1–2 months', months: [1, 2] },
  { label: '2 months', months: [2, 2] },
  { label: '4 months', months: [4, 4] },
  { label: '6 months', months: [6, 6] },
  { label: '6–18 months', months: [6, 18] },
  { label: '12–15 months', months: [12, 15] },
  { label: '12–23 months', months: [12, 23] },
  { label: '15–18 months', months: [15, 18] },
]

export function getVaccineByKey(key: string): VaccineEntry | undefined {
  return VACCINE_SCHEDULE.find((v) => v.key === key)
}
