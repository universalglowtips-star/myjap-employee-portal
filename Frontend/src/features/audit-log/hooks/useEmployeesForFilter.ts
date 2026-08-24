import { useQuery } from '@tanstack/react-query'
import { fetchEmployeesForFilter } from '../../../api/endpoints/employees'
import type { Employee } from '../../../api/types/employee'
import type { NormalizedApiError } from '../../../api/client'

/**
 * TIDAK di-gate permission employee.view secara khusus - pola sama
 * kayak useDepartments() dipanggil dari PositionFormModal (Tugas 2):
 * user yang punya audit-log.view belum tentu juga punya employee.view
 * (2 permission independen), tapi filter "Dilakukan oleh" tetap harus
 * bisa jalan buat mereka. Kalau beneran 403, `isError` ketangkep di
 * pemanggil dan filter di-disable + dikasih keterangan (bukan
 * dibiarkan kosong tanpa alasan).
 */
export function useEmployeesForFilter() {
  return useQuery<Employee[], NormalizedApiError>({
    queryKey: ['employees-for-filter'],
    queryFn: fetchEmployeesForFilter,
  })
}
