import { apiClient } from '../client'
import type { LeaveListResponse, LeaveQueryParams } from '../types/leave'

/** GET /leaves - query SUDAH ->latest() di backend (order by created_at desc). ScopesOwnData otomatis batasin EMPLOYEE ke cutinya sendiri. */
export async function fetchLeaves(params: LeaveQueryParams): Promise<LeaveListResponse> {
  const res = await apiClient.get<LeaveListResponse>('/leaves', { params })
  return res.data
}
