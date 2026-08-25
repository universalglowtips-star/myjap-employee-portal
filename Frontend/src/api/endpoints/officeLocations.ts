import { apiClient } from '../client'
import type { ApiSuccessResponse } from '../types/common'
import type { OfficeLocation, OfficeLocationCreateRequest, OfficeLocationUpdateRequest } from '../types/officeLocation'

/** GET /office-locations - index gak paginated (array flat), permission office-location.view. */
export async function fetchOfficeLocations(): Promise<OfficeLocation[]> {
  const res = await apiClient.get<ApiSuccessResponse<OfficeLocation[]>>('/office-locations')
  return res.data.data
}

/** POST /office-locations - 201, permission office-location.create. */
export async function createOfficeLocation(payload: OfficeLocationCreateRequest): Promise<OfficeLocation> {
  const res = await apiClient.post<ApiSuccessResponse<OfficeLocation>>('/office-locations', payload)
  return res.data.data
}

/** PUT /office-locations/{id} - permission office-location.update. */
export async function updateOfficeLocation(id: number, payload: OfficeLocationUpdateRequest): Promise<OfficeLocation> {
  const res = await apiClient.put<ApiSuccessResponse<OfficeLocation>>(`/office-locations/${id}`, payload)
  return res.data.data
}

/** DELETE /office-locations/{id} - soft delete (SoftDeletes trait), permission office-location.delete. */
export async function deleteOfficeLocation(id: number): Promise<void> {
  await apiClient.delete(`/office-locations/${id}`)
}
