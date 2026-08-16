import { apiClient } from '../client'
import type { ApiSuccessResponse } from '../types/common'
import type { Department, DepartmentCreateRequest, DepartmentUpdateRequest } from '../types/department'

/** GET /departments - index gak paginated (backend balikin array flat, dikonfirmasi ke controller), permission department.view. */
export async function fetchDepartments(): Promise<Department[]> {
  const res = await apiClient.get<ApiSuccessResponse<Department[]>>('/departments')
  return res.data.data
}

/** POST /departments - 201, permission department.create. */
export async function createDepartment(payload: DepartmentCreateRequest): Promise<Department> {
  const res = await apiClient.post<ApiSuccessResponse<Department>>('/departments', payload)
  return res.data.data
}

/** PUT /departments/{id} - permission department.update. */
export async function updateDepartment(id: number, payload: DepartmentUpdateRequest): Promise<Department> {
  const res = await apiClient.put<ApiSuccessResponse<Department>>(`/departments/${id}`, payload)
  return res.data.data
}

/** DELETE /departments/{id} - soft delete (SoftDeletes trait), permission department.delete. */
export async function deleteDepartment(id: number): Promise<void> {
  await apiClient.delete(`/departments/${id}`)
}
