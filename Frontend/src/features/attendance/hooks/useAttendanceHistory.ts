import { useQuery } from '@tanstack/react-query'
import { fetchAttendances } from '../../../api/endpoints/attendance'
import type { AttendanceListResponse } from '../../../api/types/attendance'
import type { NormalizedApiError } from '../../../api/client'

const HISTORY_RANGE_DAYS = 90

/** UTC-based, konsisten sama todayDateString() di useTodayAttendance.ts (Employee Home). */
function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

function startDateString(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - HISTORY_RANGE_DAYS)
  return d.toISOString().slice(0, 10)
}

export function attendanceHistoryQueryKey(page: number, perPage: number) {
  return ['attendance-history', todayDateString(), page, perPage] as const
}

/**
 * GET /attendances?start_date=90 hari lalu&end_date=hari ini (Task 9.5b,
 * Bagian B.1) - ScopesOwnData backend otomatis batasin ke absensi milik
 * sendiri (role EMPLOYEE), TIDAK perlu kirim employee_id manual, pola
 * sama persis useTodayAttendance.ts.
 */
export function useAttendanceHistory(page: number, perPage: number) {
  return useQuery<AttendanceListResponse, NormalizedApiError>({
    queryKey: attendanceHistoryQueryKey(page, perPage),
    queryFn: () =>
      fetchAttendances({
        start_date: startDateString(),
        end_date: todayDateString(),
        per_page: perPage,
        page,
      }),
  })
}
