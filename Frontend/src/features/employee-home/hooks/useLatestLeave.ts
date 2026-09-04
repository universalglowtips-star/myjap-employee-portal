import { useQuery } from '@tanstack/react-query'
import { fetchLeaves } from '../../../api/endpoints/leave'
import type { Leave } from '../../../api/types/leave'
import type { NormalizedApiError } from '../../../api/client'

/**
 * GET /leaves?per_page=1 - query backend SUDAH ->latest() (order by
 * created_at desc), jadi item pertama = pengajuan cuti PALING BARU
 * DIAJUKAN, BUKAN yang tanggalnya paling dekat/akan datang. UI wajib
 * melabeli ini eksplisit (instruksi Task 9.5 Bagian B.2).
 */
export function useLatestLeave(enabled: boolean = true) {
  return useQuery<Leave | null, NormalizedApiError>({
    queryKey: ['latest-leave'],
    queryFn: async () => {
      const res = await fetchLeaves({ per_page: 1 })
      return res.data[0] ?? null
    },
    enabled,
  })
}
