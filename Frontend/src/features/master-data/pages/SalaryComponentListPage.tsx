import { useState } from 'react'
import { Plus, Pencil, Trash2, AlertTriangle, Lock } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { usePermission } from '../../../lib/permissions'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { formatCurrency } from '../../../lib/formatCurrency'
import { SalaryComponentFormModal } from '../components/SalaryComponentFormModal'
import { useSalaryComponents } from '../hooks/useSalaryComponents'
import {
  useCreateSalaryComponent,
  useUpdateSalaryComponent,
  useDeleteSalaryComponent,
} from '../hooks/useSalaryComponentMutations'
import type { SalaryComponent, SalaryComponentCreateRequest } from '../../../api/types/salaryComponent'
import type { NormalizedApiError } from '../../../api/client'

/**
 * Struktur & pola SAMA PERSIS Departemen/Posisi/Shift Kerja/Lokasi
 * Kantor - beda cuma field/permission-code/endpoint. Kolom "Tipe"
 * DITAMBAHKAN di luar daftar kolom spek awal - `type` (earning/
 * deduction) ternyata field WAJIB di schema (gak ada di dugaan awal
 * PRD sama sekali), tanpa kolom ini gak mungkin bedain "Potongan BPJS"
 * itu nambah atau ngurangin gaji cuma dari Kode/Nama doang. Keputusan
 * sendiri (dilaporkan, sesuai pola gap-di-luar-spek sebelumnya - bukan
 * fitur baru kayak pagination/filter/export yang eksplisit dilarang,
 * ini cuma nampilin field yang emang ada & wajib).
 */
export function SalaryComponentListPage() {
  // Gate query BARENGAN permission - user tanpa salary-component.view
  // gak perlu nge-fire GET /salary-components sama sekali.
  const canView = usePermission('salary-component.view')
  const { data: salaryComponents, isLoading, isError, error } = useSalaryComponents(canView)
  const createMutation = useCreateSalaryComponent()
  const updateMutation = useUpdateSalaryComponent()
  const deleteMutation = useDeleteSalaryComponent()

  const [formOpen, setFormOpen] = useState(false)
  const [editingComponent, setEditingComponent] = useState<SalaryComponent | undefined>(undefined)
  const [deletingComponent, setDeletingComponent] = useState<SalaryComponent | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  function openCreateForm() {
    setEditingComponent(undefined)
    setFormOpen(true)
  }

  function openEditForm(component: SalaryComponent) {
    setEditingComponent(component)
    setFormOpen(true)
  }

  async function handleFormSubmit(payload: SalaryComponentCreateRequest) {
    try {
      if (editingComponent) {
        await updateMutation.mutateAsync({ id: editingComponent.id, payload })
        setToast({ variant: 'success', message: 'Komponen gaji berhasil diperbarui.' })
      } else {
        await createMutation.mutateAsync(payload)
        setToast({ variant: 'success', message: 'Komponen gaji berhasil ditambahkan.' })
      }
      setFormOpen(false)
    } catch (err) {
      const apiError = err as NormalizedApiError
      // fieldErrors (422) sudah ditangani di dalam SalaryComponentFormModal sendiri (setError per-field) -
      // di sini cuma tangkep error NON-validasi (403/500/network) buat ditampilin sebagai Toast.
      if (!apiError.fieldErrors) {
        setToast({ variant: 'error', message: apiError.message })
      }
      throw err // biar SalaryComponentFormModal tetap tau submit gagal (form gak ke-reset/close)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingComponent) return
    try {
      await deleteMutation.mutateAsync(deletingComponent.id)
      setToast({ variant: 'success', message: 'Komponen gaji berhasil dihapus.' })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setDeletingComponent(null)
    }
  }

  return (
    <AppShell
      title="Komponen Gaji"
      actions={
        <PermissionGate code="salary-component.create">
          <Button onClick={openCreateForm}>
            <Plus size={16} strokeWidth={2} />
            Tambah Komponen Gaji
          </Button>
        </PermissionGate>
      }
    >
      <PermissionGate
        code="salary-component.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">
              Kamu tidak memiliki akses untuk melihat data komponen gaji.
            </p>
          </div>
        }
      >
        {isError ? (
          // Error (403/network/500) TIDAK boleh nyamar jadi "Belum ada
          // komponen gaji" - itu 2 kondisi yang beda total.
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">
              {error?.status === 403
                ? 'Kamu tidak memiliki akses untuk melihat data komponen gaji.'
                : 'Data komponen gaji belum dapat dimuat. Coba lagi.'}
            </p>
          </div>
        ) : (
          <Table<SalaryComponent>
            isLoading={isLoading}
            data={salaryComponents ?? []}
            rowKey={(row) => row.id}
            emptyMessage="Belum ada komponen gaji."
            columns={[
              { key: 'code', header: 'Kode', mono: true, render: (row) => row.code },
              { key: 'name', header: 'Nama Komponen', render: (row) => row.name },
              {
                key: 'type',
                header: 'Tipe',
                render: (row) => (
                  <span className={row.type === 'earning' ? 'text-status-approved' : 'text-status-rejected'}>
                    {row.type === 'earning' ? 'Pemasukan' : 'Potongan'}
                  </span>
                ),
              },
              {
                key: 'default_amount',
                header: 'Jumlah Default',
                align: 'right',
                mono: true,
                render: (row) => formatCurrency(row.default_amount),
              },
              {
                key: 'is_taxable',
                header: 'Wajib Pajak?',
                // Boolean sederhana - pola inline text+warna persis Status, BUKAN badge/komponen baru.
                render: (row) => (
                  <span className={row.is_taxable ? 'text-status-approved' : 'text-neutral-400'}>
                    {row.is_taxable ? 'Ya' : 'Tidak'}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <span className={row.is_active ? 'text-status-approved' : 'text-neutral-400'}>
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
                    <PermissionGate code="salary-component.update">
                      <button
                        type="button"
                        onClick={() => openEditForm(row)}
                        aria-label={`Edit ${row.name}`}
                        className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                    </PermissionGate>
                    <PermissionGate code="salary-component.delete">
                      <button
                        type="button"
                        onClick={() => setDeletingComponent(row)}
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

      <SalaryComponentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        salaryComponent={editingComponent}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deletingComponent}
        onCancel={() => setDeletingComponent(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Komponen Gaji"
        description={`Yakin mau hapus "${deletingComponent?.name}"? Tindakan ini tidak bisa dibatalkan.`}
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
