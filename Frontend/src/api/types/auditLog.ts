import type { Employee } from './employee'

/**
 * Verifikasi: database/migrations/2026_07_30_110000_create_audit_logs_table.php
 * + app/Models/AuditLog.php ($fillable, casts, immutability guard) +
 * AuditLogController.php (index/show) - DAN dicek langsung ke response
 * API asli (curl), bukan cuma baca kode.
 *
 * `auditable_type` FULL NAMESPACE ("App\\Models\\Department"), bukan
 * nama pendek - controller nerima kedua bentuk di query PARAM filter,
 * tapi response-nya SELALU full namespace. Perlu di-strip manual
 * (lihat lib/auditLogMappings.ts) buat dapetin nama pendek "Department".
 *
 * `changed_by` - QUIRK yang dikonfirmasi dari response asli, BUKAN
 * dugaan: kolom DB `changed_by` itu integer FK, tapi controller
 * eager-load relasi `changedBy()` yang di-serialize Laravel ke key
 * SNAKE_CASE YANG SAMA PERSIS ("changed_by"). Relation data nimpa
 * raw attribute pas serialisasi (attributesToArray() lalu
 * relationsToArray() nimpa key yang sama) - hasilnya di JSON,
 * `changed_by` SELALU berupa object Employee lengkap (atau null),
 * BUKAN PERNAH integer polos. Type di sini ngikutin kenyataan itu.
 *
 * `old_values`/`new_values` - shape isinya beda-beda tergantung modul
 * yang diaudit (Department punya department_code dst, Position punya
 * allowance dst) - gak ada 1 shape tetap, makanya Record<string, unknown>.
 */
export interface AuditLog {
  id: number
  auditable_type: string
  auditable_id: number | null
  action: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  changed_by: Employee | null
  ip_address: string | null
  source: string | null
  user_agent: string | null
  description: string | null
  created_at: string
}

/** Query params GET /audit-logs - persis dokumentasi di AuditLogController::index(), + `page` (didukung implisit lewat Laravel paginate(), gak disebut eksplisit di comment controller tapi standar Laravel). */
export interface AuditLogQueryParams {
  auditable_type?: string
  auditable_id?: number
  action?: string
  changed_by?: number
  start_date?: string
  end_date?: string
  per_page?: number
  page?: number
}

/**
 * Response index() PUNYA field `pagination` di LUAR `data` - beda
 * dari Department/Position (array flat) DAN beda dari bentuk
 * ApiSuccessResponse<T> generic biasa (yang cuma {success,message,data}).
 * Didefinisikan lengkap di sini, bukan di-cast paksa ke generic yang
 * gak match.
 */
export interface AuditLogListResponse {
  success: true
  message: string
  total: number
  data: AuditLog[]
  pagination: {
    current_page: number
    per_page: number
    last_page: number
  }
}
