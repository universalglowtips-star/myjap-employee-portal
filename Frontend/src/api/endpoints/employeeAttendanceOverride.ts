import { apiClient } from '../client'
import type { ApiSuccessResponse } from '../types/common'
import type {
  EmployeeAttendanceLocationOverride,
  EmployeeAttendanceLocationOverrideShowData,
  EmployeeAttendanceLocationOverrideUpdateRequest,
} from '../types/employeeAttendanceOverride'

/** GET employees/{employee}/attendance-location-override - selalu 200, `override` null kalau belum ada (bukan 404). */
export async function fetchEmployeeAttendanceOverride(employeeId: number): Promise<EmployeeAttendanceLocationOverrideShowData> {
  const res = await apiClient.get<{ success: true; message: string; data: EmployeeAttendanceLocationOverrideShowData }>(
    `/employees/${employeeId}/attendance-location-override`
  )
  return res.data.data
}

/** PUT employees/{employee}/attendance-location-override - upsert (updateOrCreate di backend), body JSON biasa (bukan FormData - tidak ada upload file di endpoint ini). */
export async function updateEmployeeAttendanceOverride(
  employeeId: number,
  payload: EmployeeAttendanceLocationOverrideUpdateRequest
): Promise<EmployeeAttendanceLocationOverride> {
  const res = await apiClient.put<ApiSuccessResponse<EmployeeAttendanceLocationOverride>>(
    `/employees/${employeeId}/attendance-location-override`,
    payload
  )
  return res.data.data
}

/** DELETE employees/{employee}/attendance-location-override - karyawan balik ikut Position Policy. Permission attendance-location-policy.update (BUKAN .delete - dikonfirmasi dari routes/api.php). */
export async function deleteEmployeeAttendanceOverride(employeeId: number): Promise<void> {
  await apiClient.delete(`/employees/${employeeId}/attendance-location-override`)
}
