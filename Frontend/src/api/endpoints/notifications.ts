import { apiClient } from '../client'
import type { ApiSuccessResponse } from '../types/common'
import type { Notification, NotificationListResponse, NotificationQueryParams } from '../types/notification'

/** GET /notifications - personal-scoped otomatis, response LENGKAP (bukan cuma .data.data) karena caller butuh `pagination` buat Table.tsx - pola sama persis fetchEmployeesPaginated. */
export async function fetchNotifications(params: NotificationQueryParams): Promise<NotificationListResponse> {
  const res = await apiClient.get<NotificationListResponse>('/notifications', { params })
  return res.data
}

/** GET /notifications/unread-count - buat badge angka bell Topbar, di-polling (bukan sekali fetch) di hook pemanggilnya. */
export async function fetchUnreadNotificationCount(): Promise<number> {
  const res = await apiClient.get<{ success: true; data: { unread_count: number } }>('/notifications/unread-count')
  return res.data.data.unread_count
}

/** POST /notifications/{id}/read - idempotent di backend (no-op kalau udah is_read=true), tapi caller tetap guard client-side biar gak kirim request percuma tiap klik. */
export async function markNotificationAsRead(id: number): Promise<Notification> {
  const res = await apiClient.post<ApiSuccessResponse<Notification>>(`/notifications/${id}/read`)
  return res.data.data
}

/** POST /notifications/read-all - balikin total_updated (bukan data notifikasi), dipakai buat pesan toast. */
export async function markAllNotificationsAsRead(): Promise<number> {
  const res = await apiClient.post<{ success: true; message: string; total_updated: number }>('/notifications/read-all')
  return res.data.total_updated
}

/** DELETE /notifications/{id} - permission notification.delete (terpisah dari .view). */
export async function deleteNotification(id: number): Promise<void> {
  await apiClient.delete(`/notifications/${id}`)
}
