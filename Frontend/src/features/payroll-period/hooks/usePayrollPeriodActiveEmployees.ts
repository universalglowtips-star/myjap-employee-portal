import { useQuery } from '@tanstack/react-query'
import { fetchActiveEmployeesForAttendanceFilter } from '../../../api/endpoints/employees'
import type { Employee } from '../../../api/types/employee'
import type { NormalizedApiError } from '../../../api/client'

/**
 * Reuse endpoint yang sama kayak filter Monitoring Absensi (Task 10) -
 * GET /employees TERKONFIRMASI gak punya filter office_location_id
 * server-side (lihat EmployeeQueryParams), jadi ambil semua employee
 * aktif (per_page besar) dan filter ke cabang periode ini CLIENT-SIDE
 * di pemanggil (PayrollPeriodQuantitiesSection). Query key terpisah
 * dari useActiveEmployeesForFilter (attendance) - cache independen,
 * feature boundary tetap bersih.
 */
export function usePayrollPeriodActiveEmployees() {
  return useQuery<Employee[], NormalizedApiError>({
    queryKey: ['active-employees-for-payroll-period'],
    queryFn: fetchActiveEmployeesForAttendanceFilter,
  })
}
