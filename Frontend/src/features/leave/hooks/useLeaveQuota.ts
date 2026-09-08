import { useQuery } from '@tanstack/react-query'
import { fetchLeaveQuota } from '../../../api/endpoints/leave'
import type { LeaveQuota } from '../../../api/types/leave'
import type { NormalizedApiError } from '../../../api/client'

/** GET /leaves/quota - tanpa employeeId, backend default ke user login (widget kuota di form pengajuan karyawan sendiri). `enabled` opsional buat nonaktifin fetch kalau widget belum perlu tampil (mis. leave_type yang dipilih bukan Annual Leave). */
export function useLeaveQuota(employeeId?: number, enabled: boolean = true) {
  return useQuery<LeaveQuota, NormalizedApiError>({
    queryKey: ['leave-quota', employeeId ?? 'self'],
    queryFn: () => fetchLeaveQuota(employeeId),
    enabled,
  })
}
