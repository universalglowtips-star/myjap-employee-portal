import { apiClient } from '../client'
import type { ApiSuccessResponse } from '../types/common'
import type { WorkShift, WorkShiftCreateRequest, WorkShiftUpdateRequest } from '../types/workShift'

/** GET /work-shifts - index gak paginated (array flat, WorkShiftController::index() balikin ->get() polos), permission work-shift.view. */
export async function fetchWorkShifts(): Promise<WorkShift[]> {
  const res = await apiClient.get<ApiSuccessResponse<WorkShift[]>>('/work-shifts')
  return res.data.data
}

/** POST /work-shifts - 201, permission work-shift.create. */
export async function createWorkShift(payload: WorkShiftCreateRequest): Promise<WorkShift> {
  const res = await apiClient.post<ApiSuccessResponse<WorkShift>>('/work-shifts', payload)
  return res.data.data
}

/** PUT /work-shifts/{id} - permission work-shift.update. */
export async function updateWorkShift(id: number, payload: WorkShiftUpdateRequest): Promise<WorkShift> {
  const res = await apiClient.put<ApiSuccessResponse<WorkShift>>(`/work-shifts/${id}`, payload)
  return res.data.data
}

/** DELETE /work-shifts/{id} - soft delete (SoftDeletes trait), permission work-shift.delete. */
export async function deleteWorkShift(id: number): Promise<void> {
  await apiClient.delete(`/work-shifts/${id}`)
}
