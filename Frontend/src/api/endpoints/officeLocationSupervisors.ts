import { apiClient } from '../client'
import type { ApiSuccessResponse } from '../types/common'
import type { OfficeLocationSupervisorsData } from '../types/officeLocationSupervisor'

/** GET /office-locations/{id}/supervisors - permission attendance-location-policy.view (BUKAN office-location.view). */
export async function fetchOfficeLocationSupervisors(officeLocationId: number): Promise<OfficeLocationSupervisorsData> {
  const res = await apiClient.get<ApiSuccessResponse<OfficeLocationSupervisorsData>>(
    `/office-locations/${officeLocationId}/supervisors`
  )
  return res.data.data
}

/**
 * PUT /office-locations/{id}/supervisors - permission
 * attendance-location-policy.update (BUKAN office-location.update).
 * Payload `employee_ids` array integer ID (sync total, replace daftar lama).
 */
export async function updateOfficeLocationSupervisors(
  officeLocationId: number,
  employeeIds: number[]
): Promise<OfficeLocationSupervisorsData> {
  const res = await apiClient.put<ApiSuccessResponse<OfficeLocationSupervisorsData>>(
    `/office-locations/${officeLocationId}/supervisors`,
    { employee_ids: employeeIds }
  )
  return res.data.data
}
