import { useQuery } from '@tanstack/react-query'
import { fetchUnreadNotificationCount } from '../../../api/endpoints/notifications'
import type { NormalizedApiError } from '../../../api/client'

export const unreadNotificationCountQueryKey = ['notifications-unread-count'] as const

/** refetchInterval 30_000 - polling, BUKAN real-time (dikonfirmasi investigasi sebelumnya: gak ada broadcasting/WebSocket sama sekali di backend, BROADCAST_CONNECTION=log di .env). */
export function useUnreadNotificationCount(enabled: boolean = true) {
  return useQuery<number, NormalizedApiError>({
    queryKey: unreadNotificationCountQueryKey,
    queryFn: fetchUnreadNotificationCount,
    enabled,
    refetchInterval: 30_000,
  })
}
