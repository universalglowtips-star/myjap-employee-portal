import type { Employee } from './employee'
import type { OfficeLocation } from './officeLocation'
import type { WorkShift } from './workShift'

/**
 * Verifikasi: app/Models/Attendance.php ($fillable, tanpa $casts
 * eksplisit) + AttendanceController (index/store/update, dibaca ulang
 * lengkap sesi investigasi Task 9.5).
 *
 * check_in_latitude/longitude/check_out_latitude/longitude (decimal
 * 10,7) dan working_hours/overtime_hours (decimal 5,2): TANPA $casts
 * eksplisit di model -> pola sama OfficeLocation.latitude/longitude,
 * balik sebagai number atau string tergantung endpoint (response
 * store()/update() langsung vs GET murni) - di-type number|string
 * biar aman dipakai di dua konteks.
 */
export interface Attendance {
  id: number
  employee_id: number
  office_location_id: number
  work_shift_id: number | null
  attendance_date: string
  check_in: string | null
  check_in_latitude: number | string | null
  check_in_longitude: number | string | null
  check_in_photo: string | null
  check_out: string | null
  check_out_latitude: number | string | null
  check_out_longitude: number | string | null
  check_out_photo: string | null
  device_name: string | null
  ip_address: string | null
  attendance_status: 'Present' | 'Late' | 'Leave' | 'Sick' | 'Permission' | 'Absent'
  late_minutes: number
  working_hours: number | string
  overtime_hours: number | string
  is_valid_location: boolean
  is_valid_selfie: boolean
  is_approved: boolean
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  employee?: Employee
  office_location?: OfficeLocation
  work_shift?: WorkShift
}

export interface AttendanceListResponse {
  success: true
  message: string
  total: number
  data: Attendance[]
  pagination: {
    current_page: number
    per_page: number
    last_page: number
  }
}

export interface AttendanceQueryParams {
  employee_id?: number
  office_location_id?: number
  attendance_status?: string
  start_date?: string
  end_date?: string
  per_page?: number
  page?: number
}

/**
 * REQUEST POST /attendances - office_location_id/attendance_date/
 * attendance_status WAJIB (AttendanceController::store() validate()).
 * employee_id SENGAJA TIDAK ada di sini - backend resolve otomatis
 * dari user login kalau role EMPLOYEE (resolveEmployeeIdForStore),
 * Employee Home gak pernah kirim field ini.
 */
export interface AttendanceCheckInRequest {
  office_location_id: number
  attendance_date: string
  attendance_status: 'Present' | 'Late'
  check_in: string
  check_in_latitude?: number | null
  check_in_longitude?: number | null
  check_in_photo?: string | null
}

/**
 * REQUEST PUT /attendances/{id} - Absen Pulang cuma isi field
 * check_out/* (semua field di update() backend 'sometimes'/'nullable',
 * field yang gak dikirim otomatis dipertahankan dari baris lama -
 * dikonfirmasi dari AttendanceController::update()). SENGAJA TIDAK
 * ikut kirim office_location_id/attendance_status ulang - biar gak
 * ke-trigger ulang pengecekan isOfficeAllowed() yang gak relevan
 * buat aksi check-out.
 */
export interface AttendanceCheckOutRequest {
  check_out: string
  check_out_latitude?: number | null
  check_out_longitude?: number | null
  check_out_photo?: string | null
}

/**
 * GET /attendances/allowed-offices (endpoint baru Task 9.5) - daftar
 * kantor yang diizinkan buat employee yang login HARI INI, sesuai
 * priority Employee Override > Position Policy > Home Office
 * (AttendanceLocationPolicyService::getAllowedOfficeIds(), TIDAK
 * ditulis ulang di frontend). Field office_name (BUKAN `name`) -
 * konsisten sama penamaan field OfficeLocation di seluruh API lain,
 * dikonfirmasi lewat curl asli ke endpoint ini.
 */
export interface AllowedOffice {
  id: number
  office_name: string
  latitude: string
  longitude: string
  radius_meter: number
}

export interface AllowedOfficesResponse {
  success: true
  message: string
  data: AllowedOffice[]
}
