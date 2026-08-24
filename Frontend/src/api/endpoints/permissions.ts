import { apiClient } from '../client'
import type { ApiSuccessResponse } from '../types/common'
import type { PermissionsByModule, RolePermissionsData } from '../types/permission'

/** GET /permissions - permission role.view. Response dikelompokkan per modul (object), bukan array flat. */
export async function fetchPermissionsByModule(): Promise<PermissionsByModule> {
  const res = await apiClient.get<ApiSuccessResponse<PermissionsByModule>>('/permissions')
  return res.data.data
}

/** GET /roles/{id}/permissions - permission role.view. */
export async function fetchRolePermissions(roleId: number): Promise<RolePermissionsData> {
  const res = await apiClient.get<ApiSuccessResponse<RolePermissionsData>>(`/roles/${roleId}/permissions`)
  return res.data.data
}

/**
 * PUT /roles/{id}/permissions - permission role.update. Payload
 * `permission_ids` array integer ID (BUKAN permission_code atau
 * struktur per-modul). Backend TOLAK (422) kalau target role-nya
 * SUPER_ADMIN - itu ditangani lewat NormalizedApiError di pemanggil
 * (Toast), bukan dicegah di sini.
 */
export async function updateRolePermissions(roleId: number, permissionIds: number[]) {
  const res = await apiClient.put<ApiSuccessResponse<unknown>>(`/roles/${roleId}/permissions`, {
    permission_ids: permissionIds,
  })
  return res.data.data
}
