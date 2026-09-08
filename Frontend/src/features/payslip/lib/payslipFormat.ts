/** Sama persis MONTH_NAMES di PayslipCard.tsx (Employee Home, Task 9.5) - duplikat kecil disengaja, bukan refactor file lain yang sudah ship di luar scope Task 12. */
export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export function formatMonthYear(month: number, year: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`
}
