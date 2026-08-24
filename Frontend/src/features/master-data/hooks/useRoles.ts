import { useQuery } from '@tanstack/react-query'
import { fetchRoles } from '../../../api/endpoints/roles'
import type { Role } from '../../../api/types/role'
import type { NormalizedApiError } from '../../../api/client'

/** Query key 'roles' - dipakai juga di mutations buat invalidation, harus persis sama stringnya. */
export const rolesQueryKey = ['roles'] as const

/** `enabled` opsional (default true) - dipakai buat gating query barengan PermissionGate (lihat RoleListPage), pola sama persis useDepartments/usePositions. */
export function useRoles(enabled: boolean = true) {
  return useQuery<Role[], NormalizedApiError>({
    queryKey: rolesQueryKey,
    queryFn: fetchRoles,
    enabled,
  })
}
