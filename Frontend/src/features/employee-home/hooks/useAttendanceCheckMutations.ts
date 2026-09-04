import { useMutation, useQueryClient } from '@tanstack/react-query'
import { checkInAttendance, checkOutAttendance } from '../../../api/endpoints/attendance'
import type { Attendance, AttendanceCheckInRequest, AttendanceCheckOutRequest } from '../../../api/types/attendance'
import type { NormalizedApiError } from '../../../api/client'
import { todayAttendanceQueryKey } from './useTodayAttendance'

export function useCheckInAttendance() {
  const queryClient = useQueryClient()
  return useMutation<Attendance, NormalizedApiError, AttendanceCheckInRequest>({
    mutationFn: checkInAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todayAttendanceQueryKey() })
    },
  })
}

export function useCheckOutAttendance() {
  const queryClient = useQueryClient()
  return useMutation<Attendance, NormalizedApiError, { id: number; payload: AttendanceCheckOutRequest }>({
    mutationFn: ({ id, payload }) => checkOutAttendance(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: todayAttendanceQueryKey() })
    },
  })
}
