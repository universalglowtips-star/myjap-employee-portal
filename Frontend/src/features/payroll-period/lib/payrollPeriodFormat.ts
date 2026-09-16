import { PERIOD_TYPE_OPTIONS } from '../../../api/types/payrollPeriod'
import { formatDate } from '../../../lib/formatDate'

/** Fallback nampilin kode aslinya kalau period_type di luar 5 nilai yang dikenal saat ini - backend gak enum-restrict (lihat catatan migration), jadi nilai baru gak boleh bikin UI ini crash/kosong. */
export function periodTypeLabel(periodType: string): string {
  return PERIOD_TYPE_OPTIONS.find((o) => o.value === periodType)?.label ?? periodType
}

export function formatPeriodRange(start: string, end: string): string {
  return `${formatDate(start)} - ${formatDate(end)}`
}

/**
 * Task 15b - PayrollPeriod TIDAK punya kolom month/year integer eksplisit
 * (cuma period_start/period_end date) - generateBulk()/publishBulk()
 * butuh {month, year} integer. Diturunkan dari period_start pakai
 * getUTC* (BUKAN getMonth/getFullYear lokal kayak formatDate.ts, yang
 * murni buat TAMPILAN) - period_start date-only string di-parse jadi
 * UTC-midnight, getUTC* motong balik ke integer yang PERSIS sama yang
 * backend simpan, gak kegeser timezone device pas dikirim balik ke API.
 */
export function getMonthYearFromPeriod(periodStart: string): { month: number; year: number } {
  const d = new Date(periodStart.replace(' ', 'T'))
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() }
}
