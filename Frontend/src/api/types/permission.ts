/**
 * Verifikasi: app/Models/Permission.php ($fillable) + PermissionController
 * + RolePermissionController (bentuk response GET/PUT /roles/{id}/permissions).
 */
export interface Permission {
  id: number
  module: string
  action: string
  permission_code: string
  description: string | null
  created_at: string
  updated_at: string
}

/**
 * GET /permissions - data DIKELOMPOKKAN per modul (object, key = nama
 * modul, value = array Permission modul itu), BUKAN array flat. Backend:
 * Permission::orderBy('module')->orderBy('action')->get()->groupBy('module').
 */
export type PermissionsByModule = Record<string, Permission[]>

/**
 * GET /roles/{id}/permissions - `permissions` isinya permission yang
 * BENERAN dimiliki role itu (baris role_permissions), KOSONG buat
 * SUPER_ADMIN by design (is_super_admin: true menandakan itu, bukan
 * dari isi array permissions-nya).
 */
export interface RolePermissionsData {
  role: {
    id: number
    role_code: string
    role_name: string
  }
  is_super_admin: boolean
  permissions: Permission[]
}
