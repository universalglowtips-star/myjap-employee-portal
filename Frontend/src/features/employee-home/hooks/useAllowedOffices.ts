import { useQuery } from '@tanstack/react-query'
import { fetchAllowedOffices } from '../../../api/endpoints/attendance'
import type { AllowedOffice } from '../../../api/types/attendance'
import type { NormalizedApiError } from '../../../api/client'

/** GET /attendances/allowed-offices - cuma di-enable pas modal Absen Masuk kebuka (dipanggil manual dari AttendanceCheckModal), bukan di-fetch di background terus-terusan. */
export function useAllowedOffices(enabled: boolean = true) {
  return useQuery<AllowedOffice[], NormalizedApiError>({
    queryKey: ['allowed-offices'],
    queryFn: fetchAllowedOffices,
    enabled,
  })
}
