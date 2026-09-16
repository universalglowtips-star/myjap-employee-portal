import { apiClient } from '../client'
import type {
  EmployeeSalaryComponent,
  EmployeeSalaryComponentListResponse,
  EmployeeSalaryComponentCreateRequest,
} from '../types/employeeSalaryComponent'
import type { ApiSuccessResponse } from '../types/common'

/** GET employees/{id}/salary-components - daftar override nominal/tarif komponen gaji milik karyawan ini. */
export async function fetchEmployeeSalaryComponents(employeeId: number): Promise<EmployeeSalaryComponent[]> {
  const res = await apiClient.get<EmployeeSalaryComponentListResponse>(`/employees/${employeeId}/salary-components`)
  return res.data.data
}

/** POST employees/{id}/salary-components - upsert (submit ulang komponen yang sama = UPDATE nominal, bukan error). */
export async function createEmployeeSalaryComponent(
  employeeId: number,
  payload: EmployeeSalaryComponentCreateRequest
): Promise<EmployeeSalaryComponent> {
  const res = await apiClient.post<ApiSuccessResponse<EmployeeSalaryComponent>>(
    `/employees/${employeeId}/salary-components`,
    payload
  )
  return res.data.data
}

/** DELETE employees/{id}/salary-components/{salaryComponentId} - cabut override, karyawan balik ikut default jabatannya. */
export async function deleteEmployeeSalaryComponent(employeeId: number, salaryComponentId: number): Promise<void> {
  await apiClient.delete(`/employees/${employeeId}/salary-components/${salaryComponentId}`)
}
