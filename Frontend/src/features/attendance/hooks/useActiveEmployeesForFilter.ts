import { useQuery } from '@tanstack/react-query'
import { fetchActiveEmployeesForAttendanceFilter } from '../../../api/endpoints/employees'
import type { Employee } from '../../../api/types/employee'
import type { NormalizedApiError } from '../../../api/client'

/**
 * Dropdown filter "Karyawan" di Monitoring Absensi Admin (Task 10) -
 * TIDAK di-gate permission employee.view secara khusus, pola sama
 * persis useEmployeesForFilter.ts (audit-log): user yang punya
 * attendance.view belum tentu juga punya employee.view (2 permission
 * independen). Kalau beneran 403, isError ketangkep di pemanggil dan
 * dropdown di-disable + dikasih keterangan.
 */
export function useActiveEmployeesForFilter() {
  return useQuery<Employee[], NormalizedApiError>({
    queryKey: ['active-employees-for-attendance-filter'],
    queryFn: fetchActiveEmployeesForAttendanceFilter,
  })
}
