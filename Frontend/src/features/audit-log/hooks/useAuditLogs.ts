import { useQuery } from '@tanstack/react-query'
import { fetchAuditLogs } from '../../../api/endpoints/auditLogs'
import type { AuditLogListResponse, AuditLogQueryParams } from '../../../api/types/auditLog'
import type { NormalizedApiError } from '../../../api/client'

/**
 * Query key nyertain `params` UTUH (bukan cuma ['audit-logs']) - filter
 * dan page beda harus jadi cache entry TanStack Query yang beda,
 * biar ganti filter/pindah halaman otomatis refetch, gak nyangkut data lama.
 */
export function useAuditLogs(params: AuditLogQueryParams, enabled: boolean = true) {
  return useQuery<AuditLogListResponse, NormalizedApiError>({
    queryKey: ['audit-logs', params],
    queryFn: () => fetchAuditLogs(params),
    enabled,
  })
}
