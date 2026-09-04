import type { WorkShift } from '../../../api/types/workShift'

/**
 * 'Present' vs 'Late' berdasar jam check-in vs jadwal shift kerja
 * (check_in_time + late_tolerance) - REPLIKASI logic dari
 * AttendanceController::calculateMetrics() (backend). Dibutuhkan
 * karena backend TIDAK auto-derive attendance_status dari
 * late_minutes yang dihitungnya sendiri - field ini genuinely wajib
 * diisi klien saat POST /attendances (dikonfirmasi investigasi Task
 * 9.5 Bagian A).
 *
 * CATATAN PENTING (temuan investigasi, bukan asumsi): `workShift` di
 * sini SELALU `undefined` di kondisi backend SEKARANG - GET /me
 * (satu-satunya sumber identitas employee yang login) cuma
 * ->load(['role', 'position']), TIDAK ikut load `work_shift`
 * (routes/api.php baris 65). Jadi fungsi ini SELALU balik 'Present'
 * di praktiknya hari ini - bukan bug di sini, tapi keterbatasan data
 * upstream. Struktur if/else tetap ditulis lengkap (bukan di-hardcode
 * 'Present' begitu saja) supaya otomatis mulai bekerja tanpa
 * perubahan kode kalau nanti /me ikut load work_shift.
 */
export function determineAttendanceStatus(checkInAt: Date, workShift?: WorkShift): 'Present' | 'Late' {
  if (!workShift) return 'Present'

  const [h, m, s] = workShift.check_in_time.split(':').map(Number)
  const scheduledCheckIn = new Date(checkInAt)
  scheduledCheckIn.setHours(h, m, s ?? 0, 0)

  const toleratedCheckIn = new Date(scheduledCheckIn.getTime() + (workShift.late_tolerance ?? 0) * 60000)

  return checkInAt.getTime() > toleratedCheckIn.getTime() ? 'Late' : 'Present'
}
