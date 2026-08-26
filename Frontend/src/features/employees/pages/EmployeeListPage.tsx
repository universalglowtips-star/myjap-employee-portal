import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Archive, AlertTriangle, Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { usePermission } from '../../../lib/permissions'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { useEmployeesPaginated } from '../hooks/useEmployeesPaginated'
import { useArchiveEmployee } from '../hooks/useEmployeeArchiveMutations'
import type { Employee } from '../../../api/types/employee'
import type { NormalizedApiError } from '../../../api/client'

const PER_PAGE = 15

/**
 * Halaman List Karyawan (Fase 8b). Endpoint GET /employees PAGINATED
 * BENERAN (bukan array flat kayak Department/Position) - wajib pakai
 * fitur pagination opt-in Table.tsx (prop `pagination`), bukan render
 * semua data. Page state disimpan di URL (useSearchParams) - pola
 * persis AuditLogListPage, biar refresh gak kehilangan posisi halaman.
 *
 * TIDAK ADA filter card (Departemen/Posisi/Status) di halaman ini -
 * dikonfirmasi langsung ke EmployeeController::index() (bukan
 * diasumsikan): controller CUMA baca query param `per_page`, gak ada
 * dukungan filter department_id/position_id/is_active sama sekali.
 * Filter client-side juga gak masuk akal dipasang di sini karena data
 * PAGINATED server-side (filter cuma bakal ngefek ke 15 baris yang
 * lagi kebuka, bukan ke seluruh data - UX menyesatkan). Temuan ini
 * dilaporkan ke user, bukan dipaksa-buat dengan cara yang salah.
 *
 * Tombol "Tambah Karyawan" & "Edit" (di kolom Aksi) SENGAJA arahkan ke
 * ROUTE terpisah (/employees/new, /employees/:id/edit) - BUKAN modal
 * seperti modul lain. Spek Fase 8b eksplisit bilang "cukup routing-nya
 * siap" (bukan "state modal-nya siap"), form lengkapnya baru Fase 8c.
 */
export function EmployeeListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const canView = usePermission('employee.view')
  const { data, isLoading, isError, error } = useEmployeesPaginated({ per_page: PER_PAGE, page }, canView)
  const archiveMutation = useArchiveEmployee()

  const [archivingEmployee, setArchivingEmployee] = useState<Employee | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  function handlePageChange(newPage: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(newPage))
      return next
    })
  }

  async function handleConfirmArchive() {
    if (!archivingEmployee) return
    try {
      await archiveMutation.mutateAsync(archivingEmployee.id)
      setToast({ variant: 'success', message: 'Karyawan berhasil diarsipkan. Data masih bisa dipulihkan dari halaman Arsip.' })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setArchivingEmployee(null)
    }
  }

  return (
    <AppShell
      title="Karyawan"
      actions={
        <div className="flex items-center gap-2">
          <PermissionGate code="employee.delete">
            <Button variant="ghost" onClick={() => navigate('/employees/archive')}>
              <Archive size={16} strokeWidth={2} />
              Lihat Arsip
            </Button>
          </PermissionGate>
          <PermissionGate code="employee.create">
            <Button onClick={() => navigate('/employees/new')}>
              <Plus size={16} strokeWidth={2} />
              Tambah Karyawan
            </Button>
          </PermissionGate>
        </div>
      }
    >
      <PermissionGate
        code="employee.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">
              Kamu tidak memiliki akses untuk melihat data karyawan.
            </p>
          </div>
        }
      >
        {isError ? (
          // Error (403/network/500) TIDAK boleh nyamar jadi "Belum ada
          // karyawan" - itu 2 kondisi yang beda total.
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">
              {error?.status === 403
                ? 'Kamu tidak memiliki akses untuk melihat data karyawan.'
                : 'Data karyawan belum dapat dimuat. Coba lagi.'}
            </p>
          </div>
        ) : (
          <Table<Employee>
            isLoading={isLoading}
            data={data?.data ?? []}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada karyawan."
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
              { key: 'email', header: 'Email', render: (row) => row.email },
              { key: 'department', header: 'Departemen', render: (row) => row.department?.department_name ?? '—' },
              { key: 'position', header: 'Posisi', render: (row) => row.position?.position_name ?? '—' },
              {
                key: 'status',
                header: 'Status',
                // is_active boolean sederhana, BUKAN status workflow - pola persis modul master data lain.
                render: (row) => (
                  <span className={row.is_active ? 'text-status-approved' : 'text-neutral-600'}>
                    {row.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row) => (
                  <div className="flex justify-end gap-1">
                    <PermissionGate code="employee.update">
                      <button
                        type="button"
                        onClick={() => navigate(`/employees/${row.id}/edit`)}
                        aria-label={`Edit ${row.full_name}`}
                        className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                    </PermissionGate>
                    <PermissionGate code="employee.delete">
                      <button
                        type="button"
                        onClick={() => setArchivingEmployee(row)}
                        aria-label={`Arsipkan ${row.full_name}`}
                        className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-status-pending"
                      >
                        <Archive size={14} strokeWidth={2} />
                      </button>
                    </PermissionGate>
                  </div>
                ),
              },
            ]}
          />
        )}
      </PermissionGate>

      {/* variant='default' (BUKAN 'danger') - arsip itu soft-delete yang
          REVERSIBLE (beda dari Hapus permanen di modul lain), styling
          tombol konfirmasi merah 'danger' bakal over-signal severity
          yang gak akurat buat aksi yang bisa dibatalkan. */}
      <ConfirmDialog
        open={!!archivingEmployee}
        onCancel={() => setArchivingEmployee(null)}
        onConfirm={handleConfirmArchive}
        title="Arsipkan Karyawan"
        description={`Yakin mau arsipkan "${archivingEmployee?.full_name}"? Data masih bisa dipulihkan nanti dari halaman Arsip.`}
        confirmLabel="Ya, Arsipkan"
        isConfirming={archiveMutation.isPending}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} duration={4000} />
        </div>
      )}
    </AppShell>
  )
}
