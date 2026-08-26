import { apiClient } from '../client'
import type { ApiSuccessResponse } from '../types/common'
import type {
  EmployeeOfficeScope,
  EmployeeOfficeScopeListResponse,
  EmployeeOfficeScopeCreateRequest,
} from '../types/employeeOfficeScope'

/** GET employees/{id}/office-scopes - list cabang yang jadi wewenang employee ini. */
export async function fetchEmployeeOfficeScopes(employeeId: number): Promise<EmployeeOfficeScope[]> {
  const res = await apiClient.get<EmployeeOfficeScopeListResponse>(`/employees/${employeeId}/office-scopes`)
  return res.data.data
}

/** POST employees/{id}/office-scopes - tambah 1 cabang. 409 kalau cabang itu sudah jadi wewenangnya (dicek eksplisit di store()). */
export async function createEmployeeOfficeScope(
  employeeId: number,
  payload: EmployeeOfficeScopeCreateRequest
): Promise<EmployeeOfficeScope> {
  const res = await apiClient.post<ApiSuccessResponse<EmployeeOfficeScope>>(`/employees/${employeeId}/office-scopes`, payload)
  return res.data.data
}

/** DELETE employees/{id}/office-scopes/{officeLocationId} - officeLocationId di PATH (bukan body). Permission employee.update (SAMA seperti index/store - BUKAN permission .delete terpisah). */
export async function deleteEmployeeOfficeScope(employeeId: number, officeLocationId: number): Promise<void> {
  await apiClient.delete(`/employees/${employeeId}/office-scopes/${officeLocationId}`)
}
