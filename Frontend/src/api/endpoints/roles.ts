import { apiClient } from '../client'
import type { ApiSuccessResponse } from '../types/common'
import type { Role, RoleCreateRequest, RoleUpdateRequest } from '../types/role'

/**
 * GET /roles - permission role.view. Response index RoleController punya
 * field `total` tambahan di luar `data` (beda dari Department/Position),
 * tapi gak dibutuhkan di sini jadi gak dideklarasikan di tipe - `data`
 * tetap array flat sama seperti modul lain.
 */
export async function fetchRoles(): Promise<Role[]> {
  const res = await apiClient.get<ApiSuccessResponse<Role[]>>('/roles')
  return res.data.data
}

/** POST /roles - permission role.create. */
export async function createRole(payload: RoleCreateRequest): Promise<Role> {
  const res = await apiClient.post<ApiSuccessResponse<Role>>('/roles', payload)
  return res.data.data
}

/** PUT /roles/{id} - permission role.update. */
export async function updateRole(id: number, payload: RoleUpdateRequest): Promise<Role> {
  const res = await apiClient.put<ApiSuccessResponse<Role>>(`/roles/${id}`, payload)
  return res.data.data
}

/** DELETE /roles/{id} - soft delete (SoftDeletes trait), permission role.delete. */
export async function deleteRole(id: number): Promise<void> {
  await apiClient.delete(`/roles/${id}`)
}
