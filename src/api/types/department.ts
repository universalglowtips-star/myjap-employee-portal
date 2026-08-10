/**
 * Verifikasi: database/migrations/*_create_departments_table.php +
 * app/Models/Department.php ($fillable) + DepartmentController.php
 * (bentuk response index/show/store/update).
 *
 * SoftDeletes aktif -> deleted_at ada di response.
 */
export interface Department {
  id: number
  department_code: string
  department_name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * REQUEST create - verifikasi DepartmentController::store() validate().
 * is_active opsional (backend default true kalau gak dikirim).
 */
export interface DepartmentCreateRequest {
  department_code: string
  department_name: string
  description?: string | null
  is_active?: boolean
}

/** REQUEST update - field sama, semua tetap wajib dikirim ulang (backend validate 'required' semua kecuali description/is_active). */
export type DepartmentUpdateRequest = DepartmentCreateRequest
