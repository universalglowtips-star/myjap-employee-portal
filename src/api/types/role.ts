/**
 * Verifikasi: database/migrations/*_create_roles_table.php + app/Models/Role.php
 * SoftDeletes aktif -> deleted_at ada di response.
 */
export interface Role {
  id: number
  role_code: string
  role_name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}
