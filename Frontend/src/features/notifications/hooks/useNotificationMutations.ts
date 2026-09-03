import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../../../api/endpoints/notifications'
import { unreadNotificationCountQueryKey } from './useUnreadNotificationCount'
import type { Notification } from '../../../api/types/notification'
import type { NormalizedApiError } from '../../../api/client'

/**
 * `invalidateQueries({queryKey: ['notifications']})` PARTIAL MATCH
 * (bawaan TanStack Query) - nyenggol SEMUA variasi page/per_page
 * sekaligus (dropdown Topbar DAN halaman penuh), bukan cuma 1 cache
 * entry. Ini SENGAJA broad (beda dari pola query key spesifik di
 * fitur lain) - mutasi apa pun (read/read-all/delete) emang harus
 * nyegerin SEMUA tampilan list notifikasi, gak ada alasan buat
 * isolasi cache di sini.
 */
function invalidateNotificationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['notifications'] })
  queryClient.invalidateQueries({ queryKey: unreadNotificationCountQueryKey })
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()
  return useMutation<Notification, NormalizedApiError, number>({
    mutationFn: (id) => markNotificationAsRead(id),
    onSuccess: () => invalidateNotificationQueries(queryClient),
  })
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()
  return useMutation<number, NormalizedApiError, void>({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => invalidateNotificationQueries(queryClient),
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()
  return useMutation<void, NormalizedApiError, number>({
    mutationFn: (id) => deleteNotification(id),
    onSuccess: () => invalidateNotificationQueries(queryClient),
  })
}
