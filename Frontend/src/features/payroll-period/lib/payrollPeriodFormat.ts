import { PERIOD_TYPE_OPTIONS } from '../../../api/types/payrollPeriod'
import { formatDate } from '../../../lib/formatDate'

/** Fallback nampilin kode aslinya kalau period_type di luar 5 nilai yang dikenal saat ini - backend gak enum-restrict (lihat catatan migration), jadi nilai baru gak boleh bikin UI ini crash/kosong. */
export function periodTypeLabel(periodType: string): string {
  return PERIOD_TYPE_OPTIONS.find((o) => o.value === periodType)?.label ?? periodType
}

export function formatPeriodRange(start: string, end: string): string {
  return `${formatDate(start)} - ${formatDate(end)}`
}
