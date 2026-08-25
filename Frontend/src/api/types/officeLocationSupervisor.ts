import type { Employee } from './employee'

/**
 * GET/PUT /office-locations/{id}/supervisors - verifikasi
 * OfficeLocationSupervisorController.php. `supervisors` isinya objek
 * Employee LENGKAP (bukan array id polos) - masing2 punya field
 * tambahan `pivot: {office_location_id, employee_id}` di response asli
 * (dicek live via tinker), TAPI gak dimodelkan di sini karena gak
 * dipakai - pola sama seperti RolePermissionsData.permissions.
 *
 * Endpoint ini digate permission BERBEDA dari office-location.* -
 * pakai attendance-location-policy.view/update (dikonfirmasi dari
 * routes/api.php, BUKAN office-location.update seperti dugaan awal).
 */
export interface OfficeLocationSupervisorsData {
  office: {
    id: number
    office_code: string
    office_name: string
  }
  supervisors: Employee[]
}
