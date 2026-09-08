import { apiClient } from '../client'
import type { LeaveListResponse, LeaveQueryParams, LeaveQuotaResponse, LeaveDetailResponse } from '../types/leave'

/** GET /leaves - query SUDAH ->latest() di backend (order by created_at desc). ScopesOwnData otomatis batasin EMPLOYEE ke cutinya sendiri. */
export async function fetchLeaves(params: LeaveQueryParams): Promise<LeaveListResponse> {
  const res = await apiClient.get<LeaveListResponse>('/leaves', { params })
  return res.data
}

/** GET /leaves/quota - tanpa employee_id, backend default ke user yang login. Route literal, WAJIB di depan wildcard GET /leaves/{leave} di routes/api.php. */
export async function fetchLeaveQuota(employeeId?: number): Promise<LeaveQuotaResponse['data']> {
  const res = await apiClient.get<LeaveQuotaResponse>('/leaves/quota', {
    params: employeeId ? { employee_id: employeeId } : undefined,
  })
  return res.data.data
}

export interface CreateLeavePayload {
  employee_id?: number
  leave_type: string
  start_date: string
  end_date: string
  reason: string
  attachment?: File | null
}

/** POST /leaves - WAJIB FormData kalau ada attachment (backend nerima $request->file('attachment')->store(...), butuh body multipart/form-data asli - pola sama persis createEmployee di employees.ts). Attachment opsional, jadi field lain tetap dikirim lewat FormData walau attachment kosong (lebih sederhana daripada cabang JSON-vs-FormData terpisah). */
export async function createLeave(payload: CreateLeavePayload): Promise<LeaveDetailResponse['data']> {
  const formData = new FormData()
  if (payload.employee_id !== undefined) formData.append('employee_id', String(payload.employee_id))
  formData.append('leave_type', payload.leave_type)
  formData.append('start_date', payload.start_date)
  formData.append('end_date', payload.end_date)
  formData.append('reason', payload.reason)
  if (payload.attachment) formData.append('attachment', payload.attachment)

  const res = await apiClient.post<LeaveDetailResponse>('/leaves', formData)
  return res.data.data
}

export interface UpdateLeavePayload {
  leave_type?: string
  start_date?: string
  end_date?: string
  reason?: string
}

/** PUT /leaves/{id} - JSON biasa, TIDAK support ganti attachment di sini (di luar scope Task 11 - kalau nanti dibutuhkan, ingat gotcha PUT+multipart di updateEmployee/employees.ts: PHP gak baca body-nya sama sekali, butuh POST + _method=PUT). */
export async function updateLeave(id: number, payload: UpdateLeavePayload): Promise<LeaveDetailResponse['data']> {
  const res = await apiClient.put<LeaveDetailResponse>(`/leaves/${id}`, payload)
  return res.data.data
}

/** POST /leaves/{id}/approve - approval_notes opsional. */
export async function approveLeave(id: number, approvalNotes?: string): Promise<LeaveDetailResponse['data']> {
  const res = await apiClient.post<LeaveDetailResponse>(`/leaves/${id}/approve`, {
    approval_notes: approvalNotes || undefined,
  })
  return res.data.data
}

/** POST /leaves/{id}/reject - approval_notes WAJIB diisi (backend menolak kalau kosong). */
export async function rejectLeave(id: number, approvalNotes: string): Promise<LeaveDetailResponse['data']> {
  const res = await apiClient.post<LeaveDetailResponse>(`/leaves/${id}/reject`, { approval_notes: approvalNotes })
  return res.data.data
}

/** POST /leaves/{id}/cancel - cancel_reason WAJIB diisi, cuma boleh dari status Approved (dicek backend). */
export async function cancelLeave(id: number, cancelReason: string): Promise<LeaveDetailResponse['data']> {
  const res = await apiClient.post<LeaveDetailResponse>(`/leaves/${id}/cancel`, { cancel_reason: cancelReason })
  return res.data.data
}

/** DELETE /leaves/{id} - backend nolak kalau status sudah Approved/Cancelled. */
export async function deleteLeave(id: number): Promise<void> {
  await apiClient.delete(`/leaves/${id}`)
}
