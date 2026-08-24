/**
 * Semua mapping di sini HARDCODE (bukan diambil dinamis dari backend) -
 * sama pola-nya kayak PermissionSeeder.php dicerminkan manual ke
 * Sidebar.tsx. Daftar `auditable_type` (13) dan `action` (18)
 * DIVERIFIKASI dari data audit_logs ASLI (query tinker), bukan tebakan.
 */

/** Nama pendek model -> label Indonesia. Dipakai buat filter "Modul" & kolom tabel. */
export const MODULE_LABELS: Record<string, string> = {
  Department: 'Departemen',
  Position: 'Posisi',
  Employee: 'Karyawan',
  Attendance: 'Absensi',
  Leave: 'Cuti',
  OfficeLocation: 'Lokasi Kantor',
  PayrollPeriod: 'Periode Payroll',
  Payslip: 'Slip Gaji',
  SalaryComponent: 'Komponen Gaji',
  ApprovalWorkflow: 'Alur Approval',
  AttendanceLocationPolicy: 'Kebijakan Lokasi Absensi',
  EmployeeAttendanceLocationOverride: 'Pengecualian Lokasi Absensi Karyawan',
  EmployeeOfficeScope: 'Wewenang Cabang Karyawan',
}

/** `auditable_type` dari API selalu full namespace ("App\\Models\\Department") - potong ke nama pendek dulu sebelum lookup MODULE_LABELS. */
export function shortModuleName(auditableType: string): string {
  const parts = auditableType.split('\\')
  return parts[parts.length - 1]
}

export function moduleLabel(auditableType: string): string {
  const short = shortModuleName(auditableType)
  return MODULE_LABELS[short] ?? short
}

/** Label Indonesia per action - fallback ke string asli kalau ada action baru yang belum dipetakan. */
export const ACTION_LABELS: Record<string, string> = {
  created: 'Dibuat',
  updated: 'Diperbarui',
  deleted: 'Dihapus',
  restored: 'Dipulihkan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  submitted: 'Diajukan',
  published: 'Dipublikasikan',
  unpublished: 'Dibatalkan Publikasi',
  unpublished_cascade: 'Dibatalkan Publikasi (Berantai)',
  login: 'Login',
  logout: 'Logout',
  failed_login: 'Login Gagal',
  policy_updated: 'Kebijakan Diperbarui',
  override_created: 'Pengecualian Dibuat',
  override_updated: 'Pengecualian Diperbarui',
  override_deleted: 'Pengecualian Dihapus',
  supervisor_updated: 'Supervisor Diperbarui',
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

export type ActionColorCategory = 'green' | 'blue' | 'red' | 'gray'

/**
 * Kategori warna PERSIS sesuai spek tugas: created=hijau, updated=biru,
 * deleted=merah, approved/published=hijau, rejected=merah,
 * submitted=biru, login/logout=abu, failed_login=merah. Action LAIN
 * yang gak eksplisit disebut (restored, policy_updated, override_*,
 * supervisor_updated, unpublished, unpublished_cascade) SENGAJA gak
 * dimasukkan sini - jatuh ke fallback abu netral lewat `?? 'gray'`
 * di actionColorCategory(), bukan ditebak-tebak kategorinya.
 */
const ACTION_COLOR_CATEGORY: Record<string, ActionColorCategory> = {
  created: 'green',
  approved: 'green',
  published: 'green',
  updated: 'blue',
  submitted: 'blue',
  deleted: 'red',
  rejected: 'red',
  failed_login: 'red',
  login: 'gray',
  logout: 'gray',
}

export function actionColorCategory(action: string): ActionColorCategory {
  return ACTION_COLOR_CATEGORY[action] ?? 'gray'
}
