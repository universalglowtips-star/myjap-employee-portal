import { useQuery } from '@tanstack/react-query'
import { fetchAttendanceTrend } from '../../../api/endpoints/dashboard'
import type { AttendanceTrendData } from '../../../api/types/dashboard'
import type { NormalizedApiError } from '../../../api/client'

export const attendanceTrendQueryKey = (days: number) => ['attendance-trend', days] as const

export function useAttendanceTrend(days: number, enabled: boolean = true) {
  return useQuery<AttendanceTrendData, NormalizedApiError>({
    queryKey: attendanceTrendQueryKey(days),
    queryFn: () => fetchAttendanceTrend(days),
    enabled,
  })
}
