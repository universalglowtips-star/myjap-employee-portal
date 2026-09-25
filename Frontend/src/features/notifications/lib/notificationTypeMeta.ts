import { Ban, Bell, CheckCircle2, Clock, FileCheck, FileWarning, RotateCcw, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NotificationTypeMeta {
  icon: LucideIcon
  colorClass: string
}

/**
 * 9 `type` yang BENERAN ada di backend sekarang (dikonfirmasi
 * investigasi terpisah sebelumnya - grep `Notification::notify(` di
 * seluruh app/), dikelompokkan by sentiment sesuai instruksi tugas:
 *
 * - Positif/Selesai -> text-status-approved. BUKAN text-success -
 *   token itu STALE (nilai ASLI --color-status-approved SEBELUM
 *   digelapin karena gagal WCAG AA sebagai teks, lihat comment
 *   index.css baris ~40 - dipakai sebagai stroke chart Task 7,
 *   sengaja TIDAK dipakai sebagai teks di mana pun).
 * - Negatif/Ditolak -> text-status-rejected.
 * - Netral/Perlu-perhatian -> text-status-pending (amber). Dipilih
 *   BUKAN abu-abu polos - ke-4 type ini (leave_cancelled,
 *   payslip_unpublished, payroll_period_reverted,
 *   payroll_pending_approval) semuanya butuh tindak lanjut/perhatian
 *   user, bukan cuma info pasif - pola sama persis "Cuti Pending" &
 *   "Peringatan Sistem" di Dashboard (Task 7) yang juga pakai
 *   status-pending buat makna "perlu perhatian".
 */
const NOTIFICATION_TYPE_META: Record<string, NotificationTypeMeta> = {
  leave_approved: { icon: CheckCircle2, colorClass: 'text-status-approved' },
  payslip_published: { icon: FileCheck, colorClass: 'text-status-approved' },
  payroll_fully_approved: { icon: CheckCircle2, colorClass: 'text-status-approved' },

  leave_rejected: { icon: XCircle, colorClass: 'text-status-rejected' },
  payroll_rejected: { icon: XCircle, colorClass: 'text-status-rejected' },

  leave_cancelled: { icon: Ban, colorClass: 'text-status-pending' },
  payslip_unpublished: { icon: FileWarning, colorClass: 'text-status-pending' },
  payroll_period_reverted: { icon: RotateCcw, colorClass: 'text-status-pending' },
  payroll_pending_approval: { icon: Clock, colorClass: 'text-status-pending' },
}

/**
 * Fallback DEFENSIVE WAJIB - `type` di DB string bebas (bukan enum),
 * bisa muncul type baru kapan saja dari backend tanpa migration/rilis
 * FE baru. Icon generik + neutral-600 (bukan neutral-400 - aturan
 * kontras standing rule), title/message TETAP tampil apa adanya -
 * BUKAN error/blank.
 */
const DEFAULT_TYPE_META: NotificationTypeMeta = { icon: Bell, colorClass: 'text-neutral-600' }

export function getNotificationTypeMeta(type: string): NotificationTypeMeta {
  return NOTIFICATION_TYPE_META[type] ?? DEFAULT_TYPE_META
}

/**
 * Kunci id di `data` per kelompok type + path tujuannya. Dipisah dari
 * NOTIFICATION_TYPE_META di atas SENGAJA - meta itu murni presentasi
 * (icon/warna), ini murni navigasi; type baru bisa dapat salah satunya
 * tanpa wajib dua-duanya.
 *
 * Path DIVERIFIKASI ke App.tsx (bukan ditebak): '/leave',
 * '/payroll/payslips', '/payroll/periods/:id'.
 */
const NOTIFICATION_TARGET: Record<string, { key: string; toPath: (id: number) => string }> = {
  leave_approved: { key: 'leave_id', toPath: () => '/leave' },
  leave_rejected: { key: 'leave_id', toPath: () => '/leave' },
  leave_cancelled: { key: 'leave_id', toPath: () => '/leave' },

  // payslip_id dikirim sebagai query param - PayslipEmployeePage/
  // PayslipAdminPage buka PayslipDetailModal (yang SUDAH ada, keyed by
  // id) langsung ke payslip itu, bukan cuma mendarat di list mentah.
  payslip_published: { key: 'payslip_id', toPath: (id) => `/payroll/payslips?payslip_id=${id}` },
  payslip_unpublished: { key: 'payslip_id', toPath: (id) => `/payroll/payslips?payslip_id=${id}` },

  payroll_pending_approval: { key: 'payroll_period_id', toPath: (id) => `/payroll/periods/${id}` },
  payroll_fully_approved: { key: 'payroll_period_id', toPath: (id) => `/payroll/periods/${id}` },
  payroll_rejected: { key: 'payroll_period_id', toPath: (id) => `/payroll/periods/${id}` },
  payroll_period_reverted: { key: 'payroll_period_id', toPath: (id) => `/payroll/periods/${id}` },
}

/**
 * Path tujuan klik notifikasi, atau null kalau notifikasi ini memang
 * gak punya tujuan yang relevan - mark-as-read tetap jalan, TIDAK
 * dipaksa navigasi ke tempat yang gak nyambung.
 *
 * null dikembalikan buat 3 kasus, semuanya WAJAR (bukan error):
 * 1. `type` gak dikenal (string bebas di DB, bisa muncul type baru
 *    kapan saja tanpa rilis FE baru - pola defensive yang sama persis
 *    dipakai getNotificationTypeMeta() di atas).
 * 2. `data` null (baris notifikasi lama/seed sebelum payload id ada).
 * 3. `data` ada tapi id-nya hilang/bukan angka positif - gak mau
 *    ngarahin ke '/payroll/periods/NaN' atau '/payroll/periods/0'.
 */
export function getNotificationTargetPath(notification: { type: string; data: Record<string, unknown> | null }): string | null {
  const target = NOTIFICATION_TARGET[notification.type]
  if (!target || !notification.data) return null

  const rawId = notification.data[target.key]
  const id = typeof rawId === 'number' ? rawId : Number(rawId)

  if (!Number.isInteger(id) || id <= 0) return null

  return target.toPath(id)
}
