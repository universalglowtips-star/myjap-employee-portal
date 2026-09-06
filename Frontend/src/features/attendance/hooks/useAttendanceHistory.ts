import { useQuery } from '@tanstack/react-query'
import { fetchAttendances } from '../../../api/endpoints/attendance'
import type { AttendanceListResponse } from '../../../api/types/attendance'
import type { NormalizedApiError } from '../../../api/client'

export const HISTORY_RANGE_DAYS = 90

/** UTC-based, konsisten sama todayDateString() di useTodayAttendance.ts (Employee Home). */
export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Batas paling lampau yang boleh dipilih buat "Dari Tanggal" - persis 90 hari dari hari ini (Task 9.5b Bagian B), konsisten sama nama fitur "3 Bulan Terakhir". */
export function minStartDateString(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - HISTORY_RANGE_DAYS)
  return d.toISOString().slice(0, 10)
}

export function attendanceHistoryQueryKey(startDate: string, endDate: string, page: number, perPage: number) {
  return ['attendance-history', startDate, endDate, page, perPage] as const
}

/**
 * GET /attendances?start_date=...&end_date=... (Task 9.5b, Bagian B.1/B.2) -
 * ScopesOwnData backend otomatis batasin ke absensi milik sendiri (role
 * EMPLOYEE), TIDAK perlu kirim employee_id manual, pola sama persis
 * useTodayAttendance.ts. `startDate`/`endDate` SEKARANG datang dari luar
 * (date range picker di halaman, Bagian B) - bukan dihitung otomatis di
 * sini lagi - komponen pemanggil yang tanggung jawab clamp ke batas 90
 * hari/hari ini sebelum manggil hook ini.
 */
export function useAttendanceHistory(startDate: string, endDate: string, page: number, perPage: number) {
  return useQuery<AttendanceListResponse, NormalizedApiError>({
    queryKey: attendanceHistoryQueryKey(startDate, endDate, page, perPage),
    queryFn: () =>
      fetchAttendances({
        start_date: startDate,
        end_date: endDate,
        per_page: perPage,
        page,
      }),
  })
}
