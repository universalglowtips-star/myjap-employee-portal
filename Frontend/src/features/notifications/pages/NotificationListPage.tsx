import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCheck, Trash2, AlertTriangle, Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { usePermission } from '../../../lib/permissions'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { useNotifications } from '../hooks/useNotifications'
import {
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from '../hooks/useNotificationMutations'
import { NotificationContent } from '../components/NotificationContent'
import type { Notification } from '../../../api/types/notification'
import type { NormalizedApiError } from '../../../api/client'

const PER_PAGE = 15

/**
 * Halaman penuh /notifications (Task 9, Bagian B). List pakai
 * Table.tsx pola pagination opt-in yang sudah ada (sesuai instruksi
 * tugas eksplisit) - 1 kolom render NotificationContent (dipakai
 * PERSIS SAMA di dropdown Topbar), 1 kolom aksi hapus.
 *
 * Klik baris = mark-as-read - REUSE onRowClick bawaan Table.tsx
 * (udah handle keyboard Enter/Space + tabIndex + focus-visible),
 * BUKAN navigasi ke mana pun (instruksi eksplisit: halaman tujuan
 * Cuti/Slip Gaji/Payroll Period belum dibangun). Tombol hapus di
 * kolom aksi pakai stopPropagation - klik hapus TIDAK ikut trigger
 * mark-as-read dari row click di baris yang sama.
 */
export function NotificationListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const canView = usePermission('notification.view')
  const { data, isLoading, isError, error } = useNotifications({ per_page: PER_PAGE, page }, canView)
  const markAsReadMutation = useMarkNotificationAsRead()
  const markAllAsReadMutation = useMarkAllNotificationsAsRead()
  const deleteMutation = useDeleteNotification()

  const [deletingNotification, setDeletingNotification] = useState<Notification | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  function handlePageChange(newPage: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(newPage))
      return next
    })
  }

  function handleRowClick(row: Notification) {
    if (row.is_read) return
    markAsReadMutation.mutate(row.id, {
      onError: (err) => setToast({ variant: 'error', message: err.message }),
    })
  }

  async function handleMarkAllAsRead() {
    try {
      const totalUpdated = await markAllAsReadMutation.mutateAsync()
      setToast({ variant: 'success', message: `${totalUpdated} notifikasi ditandai sudah dibaca.` })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    }
  }

  async function handleConfirmDelete() {
    if (!deletingNotification) return
    try {
      await deleteMutation.mutateAsync(deletingNotification.id)
      setToast({ variant: 'success', message: 'Notifikasi berhasil dihapus.' })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setDeletingNotification(null)
    }
  }

  return (
    <AppShell
      title="Notifikasi"
      actions={
        <Button variant="ghost" onClick={handleMarkAllAsRead} disabled={markAllAsReadMutation.isPending}>
          <CheckCheck size={16} strokeWidth={2} />
          Tandai Semua Dibaca
        </Button>
      }
    >
      <PermissionGate
        code="notification.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">Kamu tidak memiliki akses untuk halaman ini.</p>
          </div>
        }
      >
        {isError ? (
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">
              {error?.status === 403 ? 'Kamu tidak memiliki akses untuk halaman ini.' : 'Data notifikasi belum dapat dimuat. Coba lagi.'}
            </p>
          </div>
        ) : (
          <Table<Notification>
            isLoading={isLoading}
            data={data?.data ?? []}
            rowKey={(row) => row.id}
            onRowClick={handleRowClick}
            emptyMessage="Tidak ada notifikasi."
            pagination={
              data
                ? {
                    page: data.pagination.current_page,
                    totalPages: Math.max(1, data.pagination.last_page),
                    onPageChange: handlePageChange,
                  }
                : undefined
            }
            columns={[
              {
                key: 'notification',
                header: 'Notifikasi',
                render: (row) => <NotificationContent notification={row} />,
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row) => (
                  <PermissionGate code="notification.delete">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeletingNotification(row)
                      }}
                      aria-label={`Hapus notifikasi ${row.title}`}
                      className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-status-rejected"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </PermissionGate>
                ),
              },
            ]}
          />
        )}
      </PermissionGate>

      <ConfirmDialog
        open={!!deletingNotification}
        onCancel={() => setDeletingNotification(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Notifikasi"
        description={`Yakin mau hapus notifikasi "${deletingNotification?.title}"? Aksi ini tidak bisa dibatalkan.`}
        variant="danger"
        confirmLabel="Ya, Hapus"
        isConfirming={deleteMutation.isPending}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} duration={4000} />
        </div>
      )}
    </AppShell>
  )
}
