import type { Attendance } from '../../../api/types/attendance'

export interface EmployeeAttendanceSummary {
  employee_id: number
  employee_name: string
  office_location_name: string
  present: number
  late: number
  absent: number
  /** Leave + Sick + Permission digabung jadi 1 kolom "Cuti/Izin" (instruksi eksplisit tugas). */
  leaveOrPermission: number
  /** Hitungan baris is_valid_location falsy - field ini TIDAK di-cast boolean di backend (0/1 mentah dari DB), makanya dicek `!row.is_valid_location` (falsy), BUKAN `=== false` (strict) - dikonfirmasi investigasi Task 10. */
  outsideRadius: number
}

/**
 * Agregasi per employee_id dari data mentah GET /attendances (Task 10
 * Bagian B) - TIDAK ADA endpoint backend yang udah ngitung ini
 * (dikonfirmasi investigasi), jadi dihitung di sini. Kolom "Cabang"
 * per baris summary diambil dari `office_location` baris attendance
 * PERTAMA yang ketemu buat employee itu (data sudah terurut tanggal
 * terbaru dulu dari backend) - proxy "kantor tempat check-in
 * terakhir dalam rentang filter", BUKAN office_location_id karyawan
 * di tabel employees (yang gak ikut ke-load di endpoint ini) - pilihan
 * ini disengaja karena karyawan dengan akses multi-cabang bisa aja
 * check-in di kantor berbeda-beda, gak ada satu "cabang karyawan" yang
 * pasti benar di semua kasus.
 */
export function aggregateAttendanceByEmployee(rows: Attendance[]): EmployeeAttendanceSummary[] {
  const map = new Map<number, EmployeeAttendanceSummary>()

  for (const row of rows) {
    let entry = map.get(row.employee_id)
    if (!entry) {
      entry = {
        employee_id: row.employee_id,
        employee_name: row.employee?.full_name ?? '-',
        office_location_name: row.office_location?.office_name ?? '-',
        present: 0,
        late: 0,
        absent: 0,
        leaveOrPermission: 0,
        outsideRadius: 0,
      }
      map.set(row.employee_id, entry)
    }

    switch (row.attendance_status) {
      case 'Present':
        entry.present++
        break
      case 'Late':
        entry.late++
        break
      case 'Absent':
        entry.absent++
        break
      case 'Leave':
      case 'Sick':
      case 'Permission':
        entry.leaveOrPermission++
        break
    }

    if (!row.is_valid_location) entry.outsideRadius++
  }

  return Array.from(map.values()).sort((a, b) => a.employee_name.localeCompare(b.employee_name, 'id'))
}
