import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { formatDate } from '../../../lib/formatDate'
import { useAuthStore } from '../../../stores/authStore'
import { useLeaves } from '../hooks/useLeaves'
import { useCancelLeave } from '../hooks/useLeaveMutations'
import { LeaveRequestForm } from '../components/LeaveRequestForm'
import type { Leave } from '../../../api/types/leave'
import type { NormalizedApiError } from '../../../api/client'

const PER_PAGE = 10

/**
 * Cuti - view Karyawan (Task 11 Bagian C.3) - KHUSUS role TANPA
 * dashboard.view (EMPLOYEE). Percabangan permission ada di App.tsx
 * (LeaveRoute), sama persis pola AttendanceRoute/AttendanceHistoryPage
 * (Task 9.5b/10) - halaman ini gak perlu PermissionGate sendiri karena
 * cuma bisa "ketemu" lewat percabangan itu.
 *
 * employee_id TIDAK dikirim manual ke useLeaves() - ScopesOwnData di
 * backend (LeaveController::index()) SELALU batasin ke cuti sendiri
 * kalau role EMPLOYEE, apapun filter yang dikirim (dikonfirmasi baca
 * kode controller, bukan asumsi).
 */
export function LeaveEmployeePage() {
  const employee = useAuthStore((s) => s.employee)
  const [page, setPage] = useState(1)
  const [cancelTarget, setCancelTarget] = useState<Leave | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  const { data, isLoading, isError } = useLeaves({ page, per_page: PER_PAGE })
  const cancelMutation = useCancelLeave()

  const rows = data?.data ?? []

  async function handleCancelConfirm(reason?: string) {
    if (!cancelTarget || !reason) return
    try {
      await cancelMutation.mutateAsync({ id: cancelTarget.id, cancelReason: reason })
      setToast({ variant: 'success', message: 'Pengajuan cuti berhasil dibatalkan.' })
      setCancelTarget(null)
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
      setCancelTarget(null)
    }
  }

  if (!employee) return null

  return (
    <AppShell title="Cuti">
      <div className="mb-6">
        <LeaveRequestForm employeeId={employee.id} onSuccess={() => setToast({ variant: 'success', message: 'Pengajuan cuti berhasil dibuat.' })} />
      </div>

      <h2 className="mb-3 font-display text-base font-semibold text-neutral-900">Riwayat Pengajuan Cuti</h2>

      {isError ? (
        <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
          <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
          <p className="font-body text-sm text-neutral-900">Data riwayat cuti belum dapat dimuat. Coba lagi.</p>
        </div>
      ) : (
        <Table<Leave>
          isLoading={isLoading}
          data={rows}
          rowKey={(row) => row.id}
          emptyMessage="Belum ada pengajuan cuti."
          pagination={
            data
              ? { page: data.pagination.current_page, totalPages: Math.max(1, data.pagination.last_page), onPageChange: setPage }
              : undefined
          }
          columns={[
            { key: 'leave_type', header: 'Jenis Cuti', render: (row) => row.leave_type },
            {
              key: 'tanggal',
              header: 'Tanggal',
              render: (row) => `${formatDate(row.start_date)} - ${formatDate(row.end_date)}`,
            },
            { key: 'total_days', header: 'Total Hari', align: 'right', mono: true, render: (row) => row.total_days },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            {
              key: 'aksi',
              header: 'Aksi',
              render: (row) =>
                row.status === 'Approved' ? (
                  <Button size="small" variant="ghost" onClick={() => setCancelTarget(row)}>
                    Batalkan
                  </Button>
                ) : null,
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={!!cancelTarget}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelTarget(null)}
        title="Batalkan Pengajuan Cuti"
        description={
          cancelTarget
            ? `Batalkan cuti ${cancelTarget.leave_type} tanggal ${formatDate(cancelTarget.start_date)} - ${formatDate(cancelTarget.end_date)}? Tindakan ini tidak bisa dibatalkan.`
            : ''
        }
        variant="danger"
        confirmLabel="Ya, Batalkan"
        reasonLabel="Alasan Pembatalan"
        isConfirming={cancelMutation.isPending}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} duration={4000} />
        </div>
      )}
    </AppShell>
  )
}
