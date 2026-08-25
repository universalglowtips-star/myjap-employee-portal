import { apiClient } from '../client'
import type { ApiSuccessResponse } from '../types/common'
import type { Employee } from '../types/employee'

interface EmployeeListResponse extends ApiSuccessResponse<Employee[]> {
  total: number
  pagination: { current_page: number; per_page: number; last_page: number }
}

/**
 * GET /employees - MINIMAL, cuma buat ngisi dropdown filter "Dilakukan
 * oleh" di Audit Log (bukan halaman Karyawan penuh - itu di luar scope
 * sesi ini, belum dibangun). per_page digedein manual (default backend
 * 15) - saat ini cuma ada 3 karyawan total, tapi gak mau diam-diam
 * kepotong kalau nanti nambah tanpa disadari.
 */
export async function fetchEmployeesForFilter(): Promise<Employee[]> {
  const res = await apiClient.get<EmployeeListResponse>('/employees', { params: { per_page: 100 } })
  return res.data.data
}

/**
 * GET /employees - dipakai buat daftar kandidat karyawan di Tab
 * Supervisor (Lokasi Kantor). Permission employee.view - independen
 * dari office-location.* maupun attendance-location-policy.* yang
 * dipakai tab Supervisor itu sendiri (3 permission code berbeda total
 * buat fitur Supervisor berfungsi penuh). per_page digedein sama seperti
 * fetchEmployeesForFilter - alasan sama, jangan sampai diam2 kepotong.
 */
export async function fetchEmployeesForSupervisorSelection(): Promise<Employee[]> {
  const res = await apiClient.get<EmployeeListResponse>('/employees', { params: { per_page: 100 } })
  return res.data.data
}
