import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, AlertTriangle, Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { Label } from '../../../components/ui/Label'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { formatDate } from '../../../lib/formatDate'
import { useApprovalWorkflows } from '../hooks/useApprovalWorkflows'
import { useCreateApprovalWorkflow, useUpdateApprovalWorkflow, useDeleteApprovalWorkflow } from '../hooks/useApprovalWorkflowMutations'
import { ApprovalWorkflowFormModal } from '../components/ApprovalWorkflowFormModal'
import { PERIOD_TYPE_OPTIONS } from '../../../api/types/payrollPeriod'
import { periodTypeLabel } from '../../payroll-period/lib/payrollPeriodFormat'
import type { ApprovalWorkflow, ApprovalWorkflowCreateRequest } from '../../../api/types/approvalWorkflow'
import type { NormalizedApiError } from '../../../api/client'

const STATUS_OPTIONS = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
]

/**
 * Alur Approval - konfigurasi CRUD (Task 14), HRD-only (+ SUPER_ADMIN
 * bypass) - dikonfirmasi tunggal di RolePermissionSeeder.php, TIDAK ada
 * role lain (termasuk MANAGER/FINANCE yang jadi approver operasional di
 * DALAM alur ini) yang punya approval-workflow.view/create/update/delete.
 * Ini KEPUTUSAN FINAL dari investigasi Fase 1, bukan gap yang perlu
 * ditambal - MANAGER/FINANCE tetap lihat alurnya lewat ApprovalTimeline
 * di halaman Periode Payroll (Task 13), TIDAK disentuh sama sekali di
 * sini.
 *
 * Pola List+Modal SAMA PERSIS Master Data (WorkShift/Position/dst) -
 * BUKAN pola view-only Task 12. Tidak ada percabangan Route seperti
 * Attendance/Leave/Payslip - halaman ini murni admin-only, satu-satunya
 * gate ada di PermissionGate approval-workflow.view di dalam.
 */
export function ApprovalWorkflowListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const periodType = searchParams.get('period_type') ?? ''
  const isActive = searchParams.get('is_active') ?? ''

  const [formOpen, setFormOpen] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | undefined>(undefined)
  const [deletingWorkflow, setDeletingWorkflow] = useState<ApprovalWorkflow | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  const { data, isLoading, isError } = useApprovalWorkflows({
    period_type: periodType || undefined,
    is_active: isActive ? isActive === 'true' : undefined,
  })
  const createMutation = useCreateApprovalWorkflow()
  const updateMutation = useUpdateApprovalWorkflow()
  const deleteMutation = useDeleteApprovalWorkflow()

  const rows = data?.data ?? []

  function updateFilter(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })
  }

  function openCreateForm() {
    setEditingWorkflow(undefined)
    setFormOpen(true)
  }

  function openEditForm(workflow: ApprovalWorkflow) {
    setEditingWorkflow(workflow)
    setFormOpen(true)
  }

  async function handleFormSubmit(payload: ApprovalWorkflowCreateRequest) {
    try {
      if (editingWorkflow) {
        // applies_to_period_type sengaja gak dikirim di update (backend
        // gak menerimanya, lihat catatan endpoint) - payload create tetap
        // dipakai apa adanya, field itu di-ignore backend kalau ada.
        await updateMutation.mutateAsync({ id: editingWorkflow.id, payload })
        setToast({ variant: 'success', message: 'Alur approval berhasil diperbarui.' })
      } else {
        await createMutation.mutateAsync(payload)
        setToast({ variant: 'success', message: 'Alur approval berhasil ditambahkan.' })
      }
      setFormOpen(false)
    } catch (err) {
      const apiError = err as NormalizedApiError
      // fieldErrors (422 Laravel biasa) sudah ditangani di dalam Modal
      // (setError per-field). Pesan dari validateSteps() custom (urutan
      // level/role invalid) TIDAK punya fieldErrors sama sekali - tampil
      // di sini sebagai Toast, pesan backend apa adanya (bukan generic).
      if (!apiError.fieldErrors) {
        setToast({ variant: 'error', message: apiError.message })
      }
      throw err
    }
  }

  async function handleConfirmDelete() {
    if (!deletingWorkflow) return
    try {
      await deleteMutation.mutateAsync(deletingWorkflow.id)
      setToast({ variant: 'success', message: 'Alur approval berhasil dihapus.' })
    } catch (err) {
      // Pesan tolak dari backend (workflow masih dipakai periode
      // Submitted/Approved) ditampilkan apa adanya, BUKAN generic
      // "gagal menghapus" - sesuai instruksi eksplisit.
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setDeletingWorkflow(null)
    }
  }

  const emptyMessage = periodType
    ? `Belum ada alur approval untuk jenis periode "${periodTypeLabel(periodType)}" - periode jenis ini akan langsung disetujui otomatis tanpa approval berjenjang saat disubmit.`
    : 'Belum ada alur approval.'

  return (
    <AppShell
      title="Alur Approval"
      actions={
        <PermissionGate code="approval-workflow.create">
          <Button onClick={openCreateForm}>
            <Plus size={16} strokeWidth={2} />
            Tambah Alur Baru
          </Button>
        </PermissionGate>
      }
    >
      <PermissionGate
        code="approval-workflow.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">Kamu tidak memiliki akses untuk halaman ini.</p>
          </div>
        }
      >
        <div className="mb-4 flex flex-col gap-3 rounded-md bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-period-type">Jenis Periode</Label>
              <Select
                id="filter-period-type"
                options={[{ value: '', label: 'Semua Jenis' }, ...PERIOD_TYPE_OPTIONS]}
                value={periodType}
                onChange={(e) => updateFilter('period_type', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-status">Status</Label>
              <Select
                id="filter-status"
                options={[{ value: '', label: 'Semua Status' }, ...STATUS_OPTIONS]}
                value={isActive}
                onChange={(e) => updateFilter('is_active', e.target.value)}
              />
            </div>
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">Data alur approval belum dapat dimuat. Coba lagi.</p>
          </div>
        ) : (
          <Table<ApprovalWorkflow>
            isLoading={isLoading}
            data={rows}
            rowKey={(row) => row.id}
            emptyMessage={emptyMessage}
            columns={[
              { key: 'name', header: 'Nama', render: (row) => row.name },
              { key: 'period_type', header: 'Jenis Periode', render: (row) => periodTypeLabel(row.applies_to_period_type) },
              {
                key: 'status',
                header: 'Status',
                // is_active boolean sederhana, BUKAN status workflow multi-nilai
                // (beda dari StatusBadge.tsx yang vocabnya Draft/Submitted/dst) -
                // pola persis Departemen/Posisi/Role/Shift Kerja, bukan badge baru.
                render: (row) => (
                  <span className={row.is_active ? 'text-status-approved' : 'text-neutral-600'}>
                    {row.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                ),
              },
              { key: 'steps_count', header: 'Jumlah Step', align: 'right', mono: true, render: (row) => row.steps?.length ?? 0 },
              { key: 'creator', header: 'Dibuat oleh', render: (row) => row.creator?.full_name ?? '-' },
              { key: 'created_at', header: 'Tanggal Dibuat', render: (row) => formatDate(row.created_at) },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row) => (
                  <div className="flex justify-end gap-1">
                    <PermissionGate code="approval-workflow.update">
                      <button
                        type="button"
                        onClick={() => openEditForm(row)}
                        aria-label={`Edit ${row.name}`}
                        className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                    </PermissionGate>
                    <PermissionGate code="approval-workflow.delete">
                      <button
                        type="button"
                        onClick={() => setDeletingWorkflow(row)}
                        aria-label={`Hapus ${row.name}`}
                        className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-status-rejected"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </PermissionGate>
                  </div>
                ),
              },
            ]}
          />
        )}
      </PermissionGate>

      <ApprovalWorkflowFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        workflow={editingWorkflow}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deletingWorkflow}
        onCancel={() => setDeletingWorkflow(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Alur Approval"
        description={`Yakin mau hapus "${deletingWorkflow?.name}"? Tindakan ini tidak bisa dibatalkan.`}
        variant="danger"
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
