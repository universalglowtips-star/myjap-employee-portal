import { useQuery } from '@tanstack/react-query'
import { fetchNotifications } from '../../../api/endpoints/notifications'
import type { NotificationListResponse, NotificationQueryParams } from '../../../api/types/notification'
import type { NormalizedApiError } from '../../../api/client'

/** Query key TERMASUK page+per_page - dropdown Topbar (page=1, per_page=10) dan halaman penuh (page=N, per_page=15) jadi 2 cache entry independen, sama-sama pakai hook ini. */
export const notificationsQueryKey = (params: NotificationQueryParams) =>
  ['notifications', params.page ?? 1, params.per_page ?? 15] as const

export function useNotifications(params: NotificationQueryParams, enabled: boolean = true) {
  return useQuery<NotificationListResponse, NormalizedApiError>({
    queryKey: notificationsQueryKey(params),
    queryFn: () => fetchNotifications(params),
    enabled,
  })
}
