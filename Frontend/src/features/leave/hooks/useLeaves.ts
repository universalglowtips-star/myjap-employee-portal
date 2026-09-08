import { useQuery } from '@tanstack/react-query'
import { fetchLeaves } from '../../../api/endpoints/leave'
import type { LeaveListResponse, LeaveQueryParams } from '../../../api/types/leave'
import type { NormalizedApiError } from '../../../api/client'

/** GET /leaves - query SUDAH ->latest() di backend. ScopesOwnData otomatis batasin EMPLOYEE ke cutinya sendiri - dipakai APA ADANYA baik di view Karyawan (riwayat sendiri) maupun view Admin (semua karyawan, backend yang beda-in lewat role user yang login). */
export function useLeaves(params: LeaveQueryParams) {
  return useQuery<LeaveListResponse, NormalizedApiError>({
    queryKey: ['leaves', params],
    queryFn: () => fetchLeaves(params),
  })
}
