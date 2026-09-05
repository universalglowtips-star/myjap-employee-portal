import { useQuery } from '@tanstack/react-query'
import { fetchAllowedOffices } from '../../../api/endpoints/attendance'
import type { AllowedOfficesResponse, AttendanceDirection } from '../../../api/types/attendance'
import type { NormalizedApiError } from '../../../api/client'

/**
 * GET /attendances/allowed-offices?direction=... - cuma di-enable pas
 * modal Absen Masuk/Pulang kebuka. Return response PENUH (bukan cuma
 * office array) - `is_unrestricted` (Task per-arah) dibutuhkan buat
 * mode check-out juga (walau di situ daftar kantornya sendiri gak
 * dipakai, kantor sudah fixed dari baris check-in).
 */
export function useAllowedOffices(direction: AttendanceDirection, enabled: boolean = true) {
  return useQuery<AllowedOfficesResponse, NormalizedApiError>({
    queryKey: ['allowed-offices', direction],
    queryFn: () => fetchAllowedOffices(direction),
    enabled,
  })
}
