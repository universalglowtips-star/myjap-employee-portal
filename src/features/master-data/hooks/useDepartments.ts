import { useQuery } from '@tanstack/react-query'
import { fetchDepartments } from '../../../api/endpoints/departments'
import type { Department } from '../../../api/types/department'
import type { NormalizedApiError } from '../../../api/client'

/**
 * Query key 'departments' - dipakai juga di mutations buat invalidation
 * (harus persis sama string-nya, itu yang bikin TanStack Query tau
 * data mana yang perlu di-refetch setelah create/update/delete).
 */
export const departmentsQueryKey = ['departments'] as const

/**
 * `enabled` opsional - default true (perilaku lama gak berubah buat
 * pemanggil manapun yang belum kasih argumen). Ditambah buat Fase B
 * Fix: halaman bisa gating query barengan PermissionGate (lihat
 * DepartmentListPage) - user tanpa department.view gak perlu nge-fire
 * request GET /departments sama sekali, bukan cuma nyembunyiin hasilnya.
 *
 * Generic error type <Department[], NormalizedApiError> - default
 * TanStack Query cuma tau `Error` bawaan, padahal interceptor kita
 * (client.ts) selalu reject dengan NormalizedApiError. Dikasih tau
 * eksplisit di sini, bukan di-cast paksa di tiap pemanggil.
 */
export function useDepartments(enabled: boolean = true) {
  return useQuery<Department[], NormalizedApiError>({
    queryKey: departmentsQueryKey,
    queryFn: fetchDepartments,
    enabled,
  })
}
