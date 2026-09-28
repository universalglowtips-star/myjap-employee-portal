import { apiClient } from '../client'
import type { SystemWarningListResponse, SystemWarningQueryParams, SystemWarningResolveResponse } from '../types/systemWarning'

/** GET /system-warnings - paginated, filterable. Balikin response LENGKAP (bukan cuma .data.data) karena caller butuh total/pagination buat Table pagination, pola sama persis fetchAuditLogs. */
export async function fetchSystemWarnings(params: SystemWarningQueryParams): Promise<SystemWarningListResponse> {
  const res = await apiClient.get<SystemWarningListResponse>('/system-warnings', { params })
  return res.data
}

/** POST /system-warnings/{id}/resolve - block kalau sudah resolved (422, backend). */
export async function resolveSystemWarning(id: number): Promise<SystemWarningResolveResponse> {
  const res = await apiClient.post<SystemWarningResolveResponse>(`/system-warnings/${id}/resolve`)
  return res.data
}
