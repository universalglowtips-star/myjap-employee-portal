import { useQuery } from '@tanstack/react-query'
import { fetchOfficeLocations } from '../../../api/endpoints/officeLocations'
import type { OfficeLocation } from '../../../api/types/officeLocation'
import type { NormalizedApiError } from '../../../api/client'

/**
 * Dropdown filter "Cabang" di Monitoring Absensi Admin (Task 10) -
 * GET /office-locations gak paginated (array flat, sudah diurutkan
 * office_name ASC oleh backend) dan gak difilter is_active sama sekali
 * (dikonfirmasi OfficeLocationController::index()) - tampilkan APA
 * ADANYA, termasuk cabang nonaktif, karena ini filter buat DATA
 * HISTORIS (bisa aja mau lihat riwayat absensi cabang yang sekarang
 * sudah ditutup).
 */
export function useOfficeLocationsForFilter() {
  return useQuery<OfficeLocation[], NormalizedApiError>({
    queryKey: ['office-locations-for-filter'],
    queryFn: fetchOfficeLocations,
  })
}
