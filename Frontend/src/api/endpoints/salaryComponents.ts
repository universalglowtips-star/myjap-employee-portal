import { apiClient } from '../client'
import type { ApiSuccessResponse } from '../types/common'
import type { SalaryComponent, SalaryComponentCreateRequest, SalaryComponentUpdateRequest } from '../types/salaryComponent'

/**
 * GET /salary-components - index gak paginated (array flat). Controller
 * asli support query params `type`/`is_active` buat filter, TAPI SENGAJA
 * gak dipakai di sini (spek eksplisit: gak nambah fitur filter di luar
 * yang diminta) - selalu fetch semua data, filter di frontend kalau
 * nanti dibutuhkan.
 */
export async function fetchSalaryComponents(): Promise<SalaryComponent[]> {
  const res = await apiClient.get<ApiSuccessResponse<SalaryComponent[]>>('/salary-components')
  return res.data.data
}

/** POST /salary-components - 201, permission salary-component.create. */
export async function createSalaryComponent(payload: SalaryComponentCreateRequest): Promise<SalaryComponent> {
  const res = await apiClient.post<ApiSuccessResponse<SalaryComponent>>('/salary-components', payload)
  return res.data.data
}

/** PUT /salary-components/{id} - permission salary-component.update. */
export async function updateSalaryComponent(
  id: number,
  payload: SalaryComponentUpdateRequest
): Promise<SalaryComponent> {
  const res = await apiClient.put<ApiSuccessResponse<SalaryComponent>>(`/salary-components/${id}`, payload)
  return res.data.data
}

/** DELETE /salary-components/{id} - soft delete (SoftDeletes trait), permission salary-component.delete. */
export async function deleteSalaryComponent(id: number): Promise<void> {
  await apiClient.delete(`/salary-components/${id}`)
}
