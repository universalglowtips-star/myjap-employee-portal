import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { formatDate } from '../../../lib/formatDate'
import { useLeaves } from '../hooks/useLeaves'
import { useApproveLeave, useRejectLeave, useCancelLeave, useDeleteLeave } from '../hooks/useLeaveMutations'
import { useActiveEmployeesForFilter } from '../../attendance/hooks/useActiveEmployeesForFilter'
import { LeaveEditModal } from '../components/LeaveEditModal'
import type { Leave, LeaveType } from '../../../api/types/leave'
import type { NormalizedApiError } from '../../../api/client'

const PER_PAGE = 15

const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: 'Annual Leave', label: 'Annual Leave' },
  { value: 'Sick Leave', label: 'Sick Leave' },
  { value: 'Permission', label: 'Permission' },
  { value: 'Maternity Leave', label: 'Maternity Leave' },
  { value: 'Unpaid Leave', label: 'Unpaid Leave' },
  { value: 'Business Trip', label: 'Business Trip' },
]

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Cancelled', label: 'Cancelled' },
]

type ActionKind = 'approve' | 'reject' | 'cancel' | 'delete'

interface ActionTarget {
  leave: Leave
  kind: ActionKind
}

const ACTION_CONFIG: Record<
  ActionKind,
  { title: string; confirmLabel: string; variant: 'default' | 'danger'; reasonLabel?: string; successMessage: string }
> = {
  approve: { title: 'Setujui Pengajuan Cuti', confirmLabel: 'Ya, Setujui', variant: 'default', successMessage: 'Pengajuan cuti berhasil disetujui.' },
  reject: {
    title: 'Tolak Pengajuan Cuti',
    confirmLabel: 'Ya, Tolak',
    variant: 'danger',
    reasonLabel: 'Alasan Penolakan',
    successMessage: 'Pengajuan cuti berhasil ditolak.',
  },
  cancel: {
    title: 'Batalkan Cuti',
    confirmLabel: 'Ya, Batalkan',
    variant: 'danger',
    reasonLabel: 'Alasan Pembatalan',
    successMessage: 'Cuti berhasil dibatalkan.',
  },
  delete: {
    title: 'Hapus Pengajuan Cuti',
    confirmLabel: 'Ya, Hapus',
    variant: 'danger',
    successMessage: 'Pengajuan cuti berhasil dihapus.',
  },
}

/**
 * Cuti - view Approver/Admin (Task 11 Bagian C.4) - KHUSUS role DENGAN
 * dashboard.view (DIRECTOR/MANAGER/HRD/SUPER_ADMIN). Percabangan
 * permission ada di App.tsx (LeaveRoute), pola sama persis
 * AttendanceRoute/AttendanceMonitoringPage (Task 10).
 *
 * Alur approval SENGAJA single-step sederhana (siapapun yang punya
 * leave.approve/leave.reject langsung bisa approve/reject) - TIDAK
 * pakai approval_workflows (engine multi-level yang sekarang cuma
 * dipakai Payroll) - itu keputusan eksplisit user, bukan lupa/scope
 * gap, disimpen sebagai pertanyaan terbuka buat Task 14.
 *
 * PermissionGate per tombol aksi - backend JUGA enforce lewat
 * permission middleware (routes/api.php), frontend hide-only bukan
 * satu-satunya lapisan keamanan.
 */
export function LeaveAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null)
  const [editTarget, setEditTarget] = useState<Leave | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const employeeId = searchParams.get('employee_id') ?? ''
  const status = searchParams.get('status') ?? ''
  const leaveType = searchParams.get('leave_type') ?? ''
  const startDate = searchParams.get('start_date') ?? ''
  const endDate = searchParams.get('end_date') ?? ''

  const { data, isLoading, isError } = useLeaves({
    employee_id: employeeId ? Number(employeeId) : undefined,
    status: status || undefined,
    leave_type: leaveType || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    per_page: PER_PAGE,
    page,
  })
  const { data: employees, isError: isEmployeesError } = useActiveEmployeesForFilter()

  const approveMutation = useApproveLeave()
  const rejectMutation = useRejectLeave()
  const cancelMutation = useCancelLeave()
  const deleteMutation = useDeleteLeave()
  const isActing = approveMutation.isPending || rejectMutation.isPending || cancelMutation.isPending || deleteMutation.isPending

  const rows = data?.data ?? []

  function updateFilter(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page')
      return next
    })
  }

  async function handleActionConfirm(reason?: string) {
    if (!actionTarget) return
    const { leave, kind } = actionTarget
    try {
      if (kind === 'approve') await approveMutation.mutateAsync({ id: leave.id })
      else if (kind === 'reject') await rejectMutation.mutateAsync({ id: leave.id, approvalNotes: reason ?? '' })
      else if (kind === 'cancel') await cancelMutation.mutateAsync({ id: leave.id, cancelReason: reason ?? '' })
      else if (kind === 'delete') await deleteMutation.mutateAsync(leave.id)
      setToast({ variant: 'success', message: ACTION_CONFIG[kind].successMessage })
      setActionTarget(null)
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
      setActionTarget(null)
    }
  }

  const employeeOptions = [
    { value: '', label: 'Semua Karyawan' },
    ...(employees ?? []).map((e) => ({ value: String(e.id), label: e.full_name })),
  ]

  return (
    <AppShell title="Cuti">
      <PermissionGate
        code="leave.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">Kamu tidak memiliki akses untuk halaman ini.</p>
          </div>
        }
      >
        <div className="mb-4 flex flex-col gap-3 rounded-md bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-start-date">Dari Tanggal</Label>
              <Input id="filter-start-date" type="date" value={startDate} onChange={(e) => updateFilter('start_date', e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-end-date">Sampai Tanggal</Label>
              <Input id="filter-end-date" type="date" value={endDate} onChange={(e) => updateFilter('end_date', e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-employee">Karyawan</Label>
              <Select
                id="filter-employee"
                options={employeeOptions}
                disabled={isEmployeesError}
                value={employeeId}
                onChange={(e) => updateFilter('employee_id', e.target.value)}
              />
              {isEmployeesError && <p className="font-body text-xs text-status-rejected">Gagal memuat daftar karyawan.</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-status">Status</Label>
              <Select
                id="filter-status"
                options={[{ value: '', label: 'Semua Status' }, ...STATUS_OPTIONS]}
                value={status}
                onChange={(e) => updateFilter('status', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-leave-type">Jenis Cuti</Label>
              <Select
                id="filter-leave-type"
                options={[{ value: '', label: 'Semua Jenis' }, ...LEAVE_TYPE_OPTIONS]}
                value={leaveType}
                onChange={(e) => updateFilter('leave_type', e.target.value)}
              />
            </div>
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">Data pengajuan cuti belum dapat dimuat. Coba lagi.</p>
          </div>
        ) : (
          <Table<Leave>
            isLoading={isLoading}
            data={rows}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada pengajuan cuti untuk filter ini."
            pagination={
              data
                ? {
                    page: data.pagination.current_page,
                    totalPages: Math.max(1, data.pagination.last_page),
                    onPageChange: (p) => updateFilter('page', String(p)),
                  }
                : undefined
            }
            columns={[
              { key: 'employee_name', header: 'Nama Karyawan', render: (row) => row.employee?.full_name ?? '-' },
              { key: 'leave_type', header: 'Jenis Cuti', render: (row) => row.leave_type },
              { key: 'tanggal', header: 'Tanggal', render: (row) => `${formatDate(row.start_date)} - ${formatDate(row.end_date)}` },
              { key: 'total_days', header: 'Total Hari', align: 'right', mono: true, render: (row) => row.total_days },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              {
                key: 'aksi',
                header: 'Aksi',
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    {row.status === 'Pending' && (
                      <PermissionGate code="leave.approve">
                        <Button size="small" variant="ghost" onClick={() => setActionTarget({ leave: row, kind: 'approve' })}>
                          Setujui
                        </Button>
                      </PermissionGate>
                    )}
                    {row.status === 'Pending' && (
                      <PermissionGate code="leave.reject">
                        <Button size="small" variant="ghost" onClick={() => setActionTarget({ leave: row, kind: 'reject' })}>
                          Tolak
                        </Button>
                      </PermissionGate>
                    )}
                    {row.status === 'Pending' && (
                      <PermissionGate code="leave.update">
                        <Button size="small" variant="ghost" onClick={() => setEditTarget(row)}>
                          Edit
                        </Button>
                      </PermissionGate>
                    )}
                    {row.status === 'Approved' && (
                      <PermissionGate code="leave.cancel">
                        <Button size="small" variant="ghost" onClick={() => setActionTarget({ leave: row, kind: 'cancel' })}>
                          Batalkan
                        </Button>
                      </PermissionGate>
                    )}
                    {row.status !== 'Approved' && row.status !== 'Cancelled' && (
                      <PermissionGate code="leave.delete">
                        <Button size="small" variant="ghost" onClick={() => setActionTarget({ leave: row, kind: 'delete' })}>
                          Hapus
                        </Button>
                      </PermissionGate>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}

        <ConfirmDialog
          open={!!actionTarget}
          onConfirm={handleActionConfirm}
          onCancel={() => setActionTarget(null)}
          title={actionTarget ? ACTION_CONFIG[actionTarget.kind].title : ''}
          description={
            actionTarget
              ? `${actionTarget.leave.employee?.full_name ?? '-'} - ${actionTarget.leave.leave_type} (${formatDate(actionTarget.leave.start_date)} - ${formatDate(actionTarget.leave.end_date)})`
              : ''
          }
          variant={actionTarget ? ACTION_CONFIG[actionTarget.kind].variant : 'default'}
          confirmLabel={actionTarget ? ACTION_CONFIG[actionTarget.kind].confirmLabel : undefined}
          reasonLabel={actionTarget ? ACTION_CONFIG[actionTarget.kind].reasonLabel : undefined}
          isConfirming={isActing}
        />

        <LeaveEditModal
          leave={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null)
            setToast({ variant: 'success', message: 'Pengajuan cuti berhasil diperbarui.' })
          }}
          onError={(message) => setToast({ variant: 'error', message })}
        />

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 w-80">
            <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} duration={4000} />
          </div>
        )}
      </PermissionGate>
    </AppShell>
  )
}
