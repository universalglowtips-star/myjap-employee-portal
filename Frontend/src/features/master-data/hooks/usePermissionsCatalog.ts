import { useQuery } from '@tanstack/react-query'
import { fetchPermissionsByModule } from '../../../api/endpoints/permissions'
import type { PermissionsByModule } from '../../../api/types/permission'
import type { NormalizedApiError } from '../../../api/client'

/** Katalog SEMUA permission (21 modul), dikelompokkan per modul - dipakai buat render baris grid Matrix (bukan data role tertentu). */
export const permissionsCatalogQueryKey = ['permissions-catalog'] as const

export function usePermissionsCatalog(enabled: boolean = true) {
  return useQuery<PermissionsByModule, NormalizedApiError>({
    queryKey: permissionsCatalogQueryKey,
    queryFn: fetchPermissionsByModule,
    enabled,
  })
}
