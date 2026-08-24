import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchRolePermissions, updateRolePermissions } from '../../../api/endpoints/permissions'
import type { RolePermissionsData } from '../../../api/types/permission'
import type { NormalizedApiError } from '../../../api/client'

/** Query key per-role (bukan 1 key global) - roleId di dalam array biar invalidation gak nyenggol role lain. */
export const rolePermissionsQueryKey = (roleId: number) => ['role-permissions', roleId] as const

export function useRolePermissions(roleId: number, enabled: boolean = true) {
  return useQuery<RolePermissionsData, NormalizedApiError>({
    queryKey: rolePermissionsQueryKey(roleId),
    queryFn: () => fetchRolePermissions(roleId),
    enabled,
  })
}

/** Invalidate query role-permissions role itu setelah sukses simpan - Matrix auto-refetch data terbaru. */
export function useUpdateRolePermissions(roleId: number) {
  const queryClient = useQueryClient()
  return useMutation<unknown, NormalizedApiError, number[]>({
    mutationFn: (permissionIds: number[]) => updateRolePermissions(roleId, permissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolePermissionsQueryKey(roleId) })
    },
  })
}
