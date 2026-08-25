/**
 * Verifikasi: database/migrations/2026_07_15_190418_create_work_shifts_table.php
 * + app/Models/WorkShift.php (SoftDeletes trait) + WorkShiftController.php
 * (bentuk response index/show/store/update - WorkShift::create($validated)
 * langsung, TANPA eager-load relasi apapun).
 *
 * check_in_time/check_out_time/break_start/break_end: kolom `time` TANPA
 * $casts eksplisit di model - dicek langsung ke data live (tinker), balik
 * sebagai STRING "HH:MM:SS" polos (BUKAN format epoch aneh
 * "1970-01-01T08:00:00" yang diwanti-wanti PRD - kekhawatiran itu gak
 * kejadian di sini, tapi tetap wajib di-slice ke "HH:MM" pas dipasang ke
 * <input type="time"> karena native time input cuma nerima format HH:MM,
 * bukan HH:MM:SS).
 *
 * break_start/break_end nullable (opsional) - shift tanpa jam istirahat valid.
 */
export interface WorkShift {
  id: number
  shift_code: string
  shift_name: string
  check_in_time: string
  check_out_time: string
  break_start: string | null
  break_end: string | null
  late_tolerance: number
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * REQUEST create/update - verifikasi WorkShiftController::store()/update()
 * validate(). is_active WAJIB (required|boolean) - pola sama Position,
 * BUKAN optional kayak Department. Backend TIDAK validasi format jam sama
 * sekali (cuma 'required' polos buat check_in_time/check_out_time,
 * 'nullable' polos buat break_start/break_end) - frontend (native
 * <input type="time">) yang jadi garda format, sesuai catatan PRD.
 */
export interface WorkShiftCreateRequest {
  shift_code: string
  shift_name: string
  check_in_time: string
  check_out_time: string
  break_start?: string | null
  break_end?: string | null
  late_tolerance: number
  is_active: boolean
}

export type WorkShiftUpdateRequest = WorkShiftCreateRequest
