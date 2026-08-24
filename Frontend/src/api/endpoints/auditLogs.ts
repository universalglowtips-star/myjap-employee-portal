import { apiClient } from '../client'
import type { AuditLogListResponse, AuditLogQueryParams } from '../types/auditLog'

/**
 * GET /audit-logs - paginated (beda dari Department/Position yang array
 * flat), filterable lewat query params. Balikin response LENGKAP
 * (bukan cuma `.data.data`) karena caller butuh `total`/`pagination`
 * buat kontrol Table pagination.
 */
export async function fetchAuditLogs(params: AuditLogQueryParams): Promise<AuditLogListResponse> {
  const res = await apiClient.get<AuditLogListResponse>('/audit-logs', { params })
  return res.data
}
