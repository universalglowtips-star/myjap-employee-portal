import { apiClient } from '../client'
import type { ApiSuccessResponse } from '../types/common'
import type { Employee, EmployeeListResponse, EmployeeQueryParams } from '../types/employee'

/**
 * GET /employees - MINIMAL, cuma buat ngisi dropdown filter "Dilakukan
 * oleh" di Audit Log (bukan halaman Karyawan penuh). per_page digedein
 * manual (default backend 15) - saat ini cuma ada 4 karyawan total,
 * tapi gak mau diam-diam kepotong kalau nanti nambah tanpa disadari.
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

/**
 * GET /employees - Halaman List Karyawan (Fase 8b), PAGINATED beneran
 * (bukan array flat kayak Department/Position). Balikin response
 * LENGKAP (bukan cuma `.data.data`) karena caller butuh `pagination`
 * buat kontrol Table pagination - pola sama persis fetchAuditLogs.
 * TIDAK ADA filter query param yang didukung backend (dikonfirmasi ke
 * EmployeeController::index() - cuma baca `per_page`), jadi params
 * di sini SENGAJA cuma per_page/page, gak ada department_id dst.
 */
export async function fetchEmployeesPaginated(params: EmployeeQueryParams): Promise<EmployeeListResponse> {
  const res = await apiClient.get<EmployeeListResponse>('/employees', { params })
  return res.data
}

/** GET /employees-trashed - list karyawan yang sudah di-arsipkan (soft-deleted), permission employee.delete. Route TERPISAH, bukan query param di /employees. TIDAK eager-load relasi apapun (dicek ke kode) - cuma field mentah employee sendiri. */
export async function fetchArchivedEmployees(params: EmployeeQueryParams): Promise<EmployeeListResponse> {
  const res = await apiClient.get<EmployeeListResponse>('/employees-trashed', { params })
  return res.data
}

/** DELETE /employees/{id} - SOFT DELETE langsung (bukan endpoint archive terpisah, trait SoftDeletes di model yang bikin ini otomatis "arsip" bukan hapus permanen), permission employee.delete. */
export async function archiveEmployee(id: number): Promise<void> {
  await apiClient.delete(`/employees/${id}`)
}

/** POST /employees/{id}/restore - pulihkan dari arsip, permission employee.delete (BUKAN permission terpisah - dikonfirmasi dari routes/api.php). */
export async function restoreEmployee(id: number): Promise<Employee> {
  const res = await apiClient.post<ApiSuccessResponse<Employee>>(`/employees/${id}/restore`)
  return res.data.data
}

/** GET /employees/{id} - buat pre-fill Form Edit (Fase 8c). Response show() TIDAK punya field `message` (dicek ke kode, beda dari endpoint lain) - dipakai type lokal, bukan ApiSuccessResponse<T> generic yang mewajibkan message. */
export async function fetchEmployee(id: number): Promise<Employee> {
  const res = await apiClient.get<{ success: true; data: Employee }>(`/employees/${id}`)
  return res.data.data
}

/**
 * POST /employees - Form Tambah Karyawan (Fase 8c). WAJIB FormData
 * (bukan JSON) - backend nerima field `photo` sebagai
 * $request->file('photo')->store(...), butuh body multipart/form-data
 * asli. axios otomatis set Content-Type+boundary yang benar kalau body-nya
 * instance FormData, gak perlu header manual.
 */
export async function createEmployee(formData: FormData): Promise<Employee> {
  const res = await apiClient.post<ApiSuccessResponse<Employee>>('/employees', formData)
  return res.data.data
}

/**
 * PUT /employees/{id} - Form Edit Karyawan (Fase 8c). TEMUAN KRITIS
 * (dikonfirmasi via curl, bukan dugaan): HTTP PUT asli dengan body
 * multipart/form-data TIDAK PERNAH kebaca PHP sama sekali - SEMUA field
 * (bukan cuma foto) diam-diam diabaikan. Satu-satunya cara yang beneran
 * jalan: kirim sebagai POST + field `_method=PUT` (method spoofing
 * standar Laravel, dibaca sebelum routing nge-dispatch ke controller).
 */
export async function updateEmployee(id: number, formData: FormData): Promise<Employee> {
  formData.append('_method', 'PUT')
  const res = await apiClient.post<ApiSuccessResponse<Employee>>(`/employees/${id}`, formData)
  return res.data.data
}
