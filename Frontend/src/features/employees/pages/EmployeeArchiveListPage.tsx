import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, RotateCcw, AlertTriangle, Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { usePermission } from '../../../lib/permissions'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { formatDate } from '../../../lib/formatDate'
import { useArchivedEmployees } from '../hooks/useArchivedEmployees'
import { useRestoreEmployee } from '../hooks/useEmployeeArchiveMutations'
import type { Employee } from '../../../api/types/employee'
import type { NormalizedApiError } from '../../../api/client'

const PER_PAGE = 15

/**
 * List Arsip Karyawan (Fase 8b) - GET /employees-trashed, route
 * TERPISAH dari /employees (bukan query param), permission employee.delete
 * (BUKAN permission khusus archive/restore - dikonfirmasi gak ada di
 * PermissionSeeder.php). Kolom SENGAJA cuma Kode/Nama/Tanggal Dihapus/
 * Aksi - endpoint ini TIDAK eager-load department/position/dst sama
 * sekali (dicek ke EmployeeController::trashed()), jadi kolom
 * Departemen/Posisi kayak List utama gak mungkin ditampilkan di sini
 * tanpa data yang emang gak dikirim backend.
 */
export function EmployeeArchiveListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const canAccess = usePermission('employee.delete')
  const { data, isLoading, isError, error } = useArchivedEmployees({ per_page: PER_PAGE, page }, canAccess)
  const restoreMutation = useRestoreEmployee()

  const [restoringEmployee, setRestoringEmployee] = useState<Employee | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  function handlePageChange(newPage: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(newPage))
      return next
    })
  }

  async function handleConfirmRestore() {
    if (!restoringEmployee) return
    try {
      await restoreMutation.mutateAsync(restoringEmployee.id)
      setToast({ variant: 'success', message: 'Karyawan berhasil dipulihkan.' })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setRestoringEmployee(null)
    }
  }

  return (
    <AppShell
      title="Arsip Karyawan"
      actions={
        <Button variant="ghost" onClick={() => navigate('/employees')}>
          <ArrowLeft size={16} strokeWidth={2} />
          Kembali
        </Button>
      }
    >
      <PermissionGate
        code="employee.delete"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">
              Kamu tidak memiliki akses untuk melihat arsip karyawan.
            </p>
          </div>
        }
      >
        {isError ? (
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">
              {error?.status === 403
                ? 'Kamu tidak memiliki akses untuk melihat arsip karyawan.'
                : 'Data arsip karyawan belum dapat dimuat. Coba lagi.'}
            </p>
          </div>
        ) : (
          <Table<Employee>
            isLoading={isLoading}
            data={data?.data ?? []}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada karyawan yang diarsipkan."
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
              { key: 'code', header: 'Kode Karyawan', mono: true, render: (row) => row.employee_code },
              { key: 'name', header: 'Nama Lengkap', render: (row) => row.full_name },
              { key: 'deleted_at', header: 'Tanggal Diarsipkan', render: (row) => formatDate(row.deleted_at, true) },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row) => (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setRestoringEmployee(row)}
                      aria-label={`Pulihkan ${row.full_name}`}
                      className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-primary-600"
                    >
                      <RotateCcw size={14} strokeWidth={2} />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </PermissionGate>

      <ConfirmDialog
        open={!!restoringEmployee}
        onCancel={() => setRestoringEmployee(null)}
        onConfirm={handleConfirmRestore}
        title="Pulihkan Karyawan"
        description={`Yakin mau pulihkan "${restoringEmployee?.full_name}"? Karyawan ini akan muncul lagi di List utama.`}
        confirmLabel="Ya, Pulihkan"
        isConfirming={restoreMutation.isPending}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} duration={4000} />
        </div>
      )}
    </AppShell>
  )
}
