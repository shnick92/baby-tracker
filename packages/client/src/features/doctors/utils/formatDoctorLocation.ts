// Joins the parts of a doctor's location that are present into one line,
// e.g. "Springfield Pediatrics · 12 Main St". Returns null when neither is set.
export function formatDoctorLocation(doctor: { practiceName: string | null; address: string | null }): string | null {
  const parts = [doctor.practiceName, doctor.address].filter((p): p is string => !!p && p.trim() !== '')
  return parts.length > 0 ? parts.join(' · ') : null
}
