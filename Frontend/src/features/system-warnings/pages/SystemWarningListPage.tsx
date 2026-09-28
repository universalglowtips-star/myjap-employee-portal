import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Lock, AlertTriangle, ShieldCheck } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { usePermission } from '../../../lib/permissions'
import { Table } from '../../../components/ui/Table'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { formatDate } from '../../../lib/formatDate'
import { useSystemWarnings } from '../hooks/useSystemWarnings'
import { useResolveSystemWarning } from '../hooks/useSystemWarningMutations'
import { getSystemWarningRelatedMeta } from '../lib/systemWarningRelatedMeta'
import type { SystemWarning } from '../../../api/types/systemWarning'
import type { NormalizedApiError } from '../../../api/client'

const PER_PAGE = 20

/**
 * Fase 2 (2026-09-28) - backend SUDAH lengkap sebelum halaman ini
 * dibangun (dikonfirmasi Fase 1 investigasi, bukan fitur baru dari
 * nol): index()/resolve() sudah ada, permission system-warning.view/
 * resolve sudah ter-assign HRD (+ SUPER_ADMIN bypass). Filter state di
 * URL (useSearchParams) - pola sama persis AuditLogListPage, biar
 * refresh/share URL gak kehilangan toggle "tampilkan resolved".
 *
 * TIDAK ada filter `type` di UI Fase 2 ini (keputusan eksplisit Bagus)
 * meski backend support - kalau dibutuhkan nanti tinggal nambah UI-nya,
 * gak perlu migration/perubahan backend apapun.
 */
export function SystemWarningListPage() {
  const canView = usePermission('system-warning.view')
  const canResolve = usePermission('system-warning.resolve')
  const [searchParams, setSearchParams] = useSearchParams()
  const [resolvingWarning, setResolvingWarning] = useState<SystemWarning | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const includeResolved = searchParams.get('include_resolved') === '1'

  const { data, isLoading, isError, error } = useSystemWarnings(
    { include_resolved: includeResolved, per_page: PER_PAGE, page },
    canView
  )
  const resolveMutation = useResolveSystemWarning()

  function toggleIncludeResolved(checked: boolean) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (checked) next.set('include_resolved', '1')
      else next.delete('include_resolved')
      next.delete('page')
      return next
    })
  }

  function handlePageChange(newPage: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(newPage))
      return next
    })
  }

  async function handleConfirmResolve() {
    if (!resolvingWarning) return
    try {
      await resolveMutation.mutateAsync(resolvingWarning.id)
      setToast({ variant: 'success', message: 'System warning berhasil ditandai selesai.' })
    } catch (err) {
      // Termasuk kasus race condition (backend 422 "sudah pernah
      // di-resolve") - pesan backend ditampilkan apa adanya, list tetap
      // di-refresh (lihat onSettled di useResolveSystemWarning) supaya
      // baris ini ke-sync nunjukin status sebenarnya.
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setResolvingWarning(null)
    }
  }

  return (
    <AppShell title="Peringatan Sistem">
      <PermissionGate
        code="system-warning.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">
              Kamu tidak memiliki akses untuk melihat halaman ini.
            </p>
          </div>
        }
      >
        <div className="mb-4 flex items-center justify-between rounded-md bg-white p-4 shadow-sm">
          <label className="flex items-center gap-2 font-body text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={includeResolved}
              onChange={(e) => toggleIncludeResolved(e.target.checked)}
              className="h-4 w-4 rounded-sm border-neutral-300 text-primary-600 focus:ring-primary-600"
            />
            Tampilkan yang sudah selesai juga
          </label>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">
              {error?.status === 403
                ? 'Kamu tidak memiliki akses untuk melihat halaman ini.'
                : 'Data peringatan sistem belum dapat dimuat. Coba lagi.'}
            </p>
          </div>
        ) : !isLoading && (data?.data.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <ShieldCheck size={24} strokeWidth={2} className="text-status-approved" />
            <p className="font-body text-sm text-neutral-900">
              {includeResolved
                ? 'Belum ada riwayat peringatan sistem.'
                : 'Tidak ada peringatan sistem yang perlu ditindaklanjuti.'}
            </p>
          </div>
        ) : (
          <Table<SystemWarning>
            isLoading={isLoading}
            data={data?.data ?? []}
            rowKey={(row) => row.id}
            emptyMessage="Tidak ada peringatan sistem yang perlu ditindaklanjuti."
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
              { key: 'message', header: 'Pesan', render: (row) => row.message },
              {
                key: 'related',
                header: 'Terkait',
                render: (row) => {
                  const meta = getSystemWarningRelatedMeta(row)
                  return meta ? (
                    <Link to={meta.path} className="text-primary-700 hover:underline">
                      {meta.label}
                    </Link>
                  ) : (
                    '—'
                  )
                },
              },
              { key: 'created_at', header: 'Dibuat', render: (row) => formatDate(row.created_at, true) },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <span
                    className={
                      row.is_resolved
                        ? 'inline-flex items-center gap-1.5 font-body text-xs font-medium text-status-approved'
                        : 'inline-flex items-center gap-1.5 font-body text-xs font-medium text-status-pending'
                    }
                  >
                    <span
                      className={row.is_resolved ? 'h-1.5 w-1.5 rounded-full bg-status-approved' : 'h-1.5 w-1.5 rounded-full bg-status-pending'}
                      aria-hidden="true"
                    />
                    {row.is_resolved ? 'Selesai' : 'Belum Selesai'}
                  </span>
                ),
              },
              {
                key: 'resolved',
                header: 'Diselesaikan oleh',
                render: (row) =>
                  row.is_resolved
                    ? `${row.resolver?.full_name ?? '—'} · ${formatDate(row.resolved_at, true)}`
                    : '—',
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: (row) =>
                  !row.is_resolved && canResolve ? (
                    <Button variant="ghost" size="small" onClick={() => setResolvingWarning(row)}>
                      Resolve
                    </Button>
                  ) : null,
              },
            ]}
          />
        )}
      </PermissionGate>

      <ConfirmDialog
        open={!!resolvingWarning}
        onCancel={() => setResolvingWarning(null)}
        onConfirm={handleConfirmResolve}
        title="Resolve System Warning"
        description={`Tandai peringatan ini sudah ditangani/gak relevan lagi? "${resolvingWarning?.message ?? ''}"`}
        confirmLabel="Ya, Tandai Selesai"
        isConfirming={resolveMutation.isPending}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} duration={4000} />
        </div>
      )}
    </AppShell>
  )
}
