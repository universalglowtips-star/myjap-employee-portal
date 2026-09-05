import { apiClient } from '../client'
import type {
  Attendance,
  AttendanceListResponse,
  AttendanceQueryParams,
  AttendanceCheckInRequest,
  AttendanceCheckOutRequest,
  AllowedOfficesResponse,
  AttendanceDirection,
} from '../types/attendance'

export async function fetchAttendances(params: AttendanceQueryParams): Promise<AttendanceListResponse> {
  const res = await apiClient.get<AttendanceListResponse>('/attendances', { params })
  return res.data
}

/** GET /attendances/allowed-offices?direction=... - lihat api/types/attendance.ts buat konteks `is_unrestricted`. */
export async function fetchAllowedOffices(direction: AttendanceDirection): Promise<AllowedOfficesResponse> {
  const res = await apiClient.get<AllowedOfficesResponse>('/attendances/allowed-offices', { params: { direction } })
  return res.data
}

/** POST /attendances - Absen Masuk. */
export async function checkInAttendance(payload: AttendanceCheckInRequest): Promise<Attendance> {
  const res = await apiClient.post<{ success: true; message: string; data: Attendance }>('/attendances', payload)
  return res.data.data
}

/** PUT /attendances/{id} - Absen Pulang, isi baris yang sudah dibuat pas check-in. */
export async function checkOutAttendance(id: number, payload: AttendanceCheckOutRequest): Promise<Attendance> {
  const res = await apiClient.put<{ success: true; message: string; data: Attendance }>(`/attendances/${id}`, payload)
  return res.data.data
}
