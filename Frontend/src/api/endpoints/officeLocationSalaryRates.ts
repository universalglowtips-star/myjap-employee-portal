import { apiClient } from '../client'
import type {
  OfficeLocationSalaryRateListResponse,
  OfficeLocationSalaryRateUpdateRequest,
} from '../types/officeLocationSalaryRate'

/** GET office-locations/{id}/salary-rates - karyawan aktif cabang ini + tarif komponen fixed/scheduled_variable relevan. */
export async function fetchOfficeLocationSalaryRates(
  officeLocationId: number
): Promise<OfficeLocationSalaryRateListResponse['data']> {
  const res = await apiClient.get<OfficeLocationSalaryRateListResponse>(`/office-locations/${officeLocationId}/salary-rates`)
  return res.data.data
}

/**
 * PUT office-locations/{id}/salary-rates - batch save SEKALIGUS, 1
 * request (bukan N request per-sel). Response CUMA {success, message} -
 * TIDAK ADA field `data` (dicek ke OfficeLocationSalaryRateController::update()),
 * beda dari ApiSuccessResponse<T> generic biasa.
 */
export async function updateOfficeLocationSalaryRates(
  officeLocationId: number,
  payload: OfficeLocationSalaryRateUpdateRequest
): Promise<void> {
  await apiClient.put<{ success: true; message: string }>(`/office-locations/${officeLocationId}/salary-rates`, payload)
}
