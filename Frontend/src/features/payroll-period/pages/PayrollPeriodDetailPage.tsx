import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, AlertTriangle, Plus } from 'lucide-react'
import { AppShell } from '../../../components/layout/AppShell'
import { PermissionGate } from '../../../components/forms/PermissionGate'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Label } from '../../../components/ui/Label'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { Table } from '../../../components/ui/Table'
import { formatDate } from '../../../lib/formatDate'
import { formatCurrency } from '../../../lib/formatCurrency'
import { usePayrollPeriod } from '../hooks/usePayrollPeriod'
import { useSubmitPayrollPeriod, useApprovePayrollPeriod, useRejectPayrollPeriod } from '../hooks/usePayrollPeriodMutations'
import { usePublishBulkPayroll } from '../hooks/useBulkPayrollMutations'
import { periodTypeLabel, formatPeriodRange } from '../lib/payrollPeriodFormat'
import { ApprovalTimeline } from '../components/ApprovalTimeline'
import { PayrollPeriodQuantitiesSection } from '../components/PayrollPeriodQuantitiesSection'
import { PayslipSituationalItemModal } from '../components/PayslipSituationalItemModal'
import type { Payslip } from '../../../api/types/payslip'
import type { NormalizedApiError } from '../../../api/client'

type ActionKind = 'submit' | 'approve' | 'reject' | 'publish'

const ACTION_CONFIG: Record<
  ActionKind,
  { title: string; confirmLabel: string; variant: 'default' | 'danger'; reasonLabel?: string; successMessage: string }
> = {
  submit: { title: 'Submit Periode Payroll', confirmLabel: 'Ya, Submit', variant: 'default', successMessage: 'Periode berhasil disubmit untuk approval.' },
  approve: { title: 'Approve Periode Payroll', confirmLabel: 'Ya, Approve', variant: 'default', successMessage: 'Periode berhasil di-approve.' },
  reject: {
    title: 'Tolak Periode Payroll',
    confirmLabel: 'Ya, Tolak',
    variant: 'danger',
    reasonLabel: 'Alasan Penolakan',
    successMessage: 'Periode ditolak, kembali ke status Draft.',
  },
  publish: {
    title: 'Publish Periode Payroll',
    confirmLabel: 'Ya, Publish',
    variant: 'default',
    successMessage: 'Payroll berhasil dipublish.',
  },
}

/**
 * Periode Payroll - Detail (Task 13 Bagian C). Permission gate
 * `dashboard.view` (sama seperti List, persis GET /payroll-periods/{id}
 * di backend). Aksi Submit/Approve/Reject masing-masing dibungkus
 * PermissionGate dengan kode permission-nya sendiri (payroll-period.submit
 * HANYA HRD yang punya - dikonfirmasi RolePermissionSeeder; approve/reject
 * MANAGER/FINANCE/HRD).
 *
 * Tombol Publish (Task 15b, MENGGANTIKAN rencana "halaman terpisah" Task
 * 15 yang sudah outdated - instruksi G eksplisit "generate/publish-nya
 * sudah jadi bagian alur baru ini") - panggil PayslipController::publishBulk()
 * (BUKAN method di PayrollPeriodController, yang emang sengaja gak
 * punya publish()) di-scope ke period_code periode INI SAJA (bukan
 * month+year polos yang bisa nyerempet cabang lain kayak generate).
 * Ditampilkan begitu status==='Approved' - guard final tetap di backend
 * (assertPeriodReadyToPublish()), tombol ini murni UX gate.
 *
 * Tombol Approve/Reject SENGAJA ditampilkan ke SEMUA role yang punya
 * permission-nya begitu status==='Submitted', TANPA cek client-side
 * "apakah sekarang giliran role saya" - backend
 * (resolveCurrentPendingApproval()) yang final-enforce ini dan balikin
 * pesan error jelas kalau bukan giliran, pola sama persis LeaveAdminPage
 * (single source of truth otorisasi tetap di backend). ApprovalTimeline
 * di bawah tetap nampilin level mana yang lagi Pending SEKARANG biar user
 * gak perlu coba-coba.
 */
export function PayrollPeriodDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const periodId = Number(id)

  const [actionKind, setActionKind] = useState<ActionKind | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)
  const [situationalTargetPayslip, setSituationalTargetPayslip] = useState<Payslip | null>(null)

  const { data, isLoading, isError } = usePayrollPeriod(periodId)

  const submitMutation = useSubmitPayrollPeriod()
  const approveMutation = useApprovePayrollPeriod()
  const rejectMutation = useRejectPayrollPeriod()
  const publishMutation = usePublishBulkPayroll(periodId)
  const isActing = submitMutation.isPending || approveMutation.isPending || rejectMutation.isPending || publishMutation.isPending

  const period = data?.data
  const summary = data?.summary

  async function handleActionConfirm(reason?: string) {
    if (!actionKind) return
    try {
      if (actionKind === 'submit') await submitMutation.mutateAsync(periodId)
      else if (actionKind === 'approve') await approveMutation.mutateAsync({ id: periodId, notes: reason })
      else if (actionKind === 'reject') await rejectMutation.mutateAsync({ id: periodId, reason: reason ?? '' })
      else if (actionKind === 'publish') {
        const result = await publishMutation.mutateAsync({ period_code: period?.period_code })
        if (!result.success) {
          const detail = result.periods.find((p) => p.period_id === periodId)
          setToast({ variant: 'error', message: detail?.message ?? result.message })
          setActionKind(null)
          return
        }
      }
      setToast({ variant: 'success', message: ACTION_CONFIG[actionKind].successMessage })
      setActionKind(null)
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
      setActionKind(null)
    }
  }

  return (
    <AppShell
      title="Detail Periode Payroll"
      actions={
        <Button variant="ghost" onClick={() => navigate('/payroll/periods')}>
          <ArrowLeft size={16} strokeWidth={2} />
          Kembali
        </Button>
      }
    >
      <PermissionGate
        code="dashboard.view"
        fallback={
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <Lock size={24} strokeWidth={2} className="text-neutral-400" />
            <p className="font-body text-sm text-neutral-600">Kamu tidak memiliki akses untuk halaman ini.</p>
          </div>
        }
      >
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-md bg-white shadow-sm" aria-hidden="true" />
        ) : isError || !period || !summary ? (
          <div className="flex flex-col items-center gap-2 rounded-md bg-white p-12 text-center shadow-sm">
            <AlertTriangle size={24} strokeWidth={2} className="text-status-rejected" />
            <p className="font-body text-sm text-neutral-900">Detail periode payroll belum dapat dimuat. Coba lagi.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-base font-medium text-neutral-900">{period.period_code}</p>
                  <p className="mt-1 font-body text-sm text-neutral-600">
                    {periodTypeLabel(period.period_type)} · {period.office_location?.office_name ?? 'Semua Cabang'}
                  </p>
                  <p className="mt-1 font-body text-sm text-neutral-600">{formatPeriodRange(period.period_start, period.period_end)}</p>
                  {period.pay_date && <p className="mt-1 font-body text-sm text-neutral-600">Tanggal Bayar: {formatDate(period.pay_date)}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={period.status} />
                  <div className="flex flex-wrap justify-end gap-2">
                    {period.status === 'Draft' && (
                      <PermissionGate code="payroll-period.submit">
                        <Button size="small" onClick={() => setActionKind('submit')}>
                          Submit
                        </Button>
                      </PermissionGate>
                    )}
                    {period.status === 'Submitted' && (
                      <PermissionGate code="payroll-period.approve">
                        <Button size="small" onClick={() => setActionKind('approve')}>
                          Approve
                        </Button>
                      </PermissionGate>
                    )}
                    {period.status === 'Submitted' && (
                      <PermissionGate code="payroll-period.reject">
                        <Button size="small" variant="ghost" onClick={() => setActionKind('reject')}>
                          Tolak
                        </Button>
                      </PermissionGate>
                    )}
                    {period.status === 'Approved' && (
                      <PermissionGate code="payroll.publish-bulk">
                        <Button size="small" onClick={() => setActionKind('publish')}>
                          Publish
                        </Button>
                      </PermissionGate>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Card>
                <Label as="p">Jumlah Payslip</Label>
                <p className="mt-2 font-display text-2xl font-semibold text-neutral-900">{summary.total_payslips}</p>
              </Card>
              <Card>
                <Label as="p">Draft</Label>
                <p className="mt-2 font-display text-2xl font-semibold text-neutral-900">{summary.draft_count}</p>
              </Card>
              <Card>
                <Label as="p">Published</Label>
                <p className="mt-2 font-display text-2xl font-semibold text-neutral-900">{summary.published_count}</p>
              </Card>
              <Card>
                <Label as="p">Total Pendapatan</Label>
                <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-neutral-900">{formatCurrency(summary.total_gross_earning)}</p>
              </Card>
              <Card>
                <Label as="p">Total Potongan</Label>
                <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-neutral-900">{formatCurrency(summary.total_deduction)}</p>
              </Card>
              <Card>
                <Label as="p">Total Gaji Bersih</Label>
                <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-neutral-900">{formatCurrency(summary.total_net_salary)}</p>
              </Card>
            </div>

            <PayrollPeriodQuantitiesSection period={period} />

            <ApprovalTimeline period={period} approvalHistoryByCycle={summary.approval_history_by_cycle} />

            <Card>
              <Label as="p">Daftar Payslip</Label>
              <div className="mt-3">
                <Table<Payslip>
                  data={period.payslips ?? []}
                  rowKey={(row) => row.id}
                  emptyMessage="Belum ada payslip di periode ini."
                  columns={[
                    { key: 'employee_name', header: 'Nama Karyawan', render: (row) => row.employee?.full_name ?? '-' },
                    { key: 'net_salary', header: 'Gaji Bersih', align: 'right', mono: true, render: (row) => formatCurrency(row.net_salary) },
                    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                    {
                      key: 'actions',
                      header: '',
                      align: 'right',
                      // Task 15b - tambah item Situasional per payslip. Cuma
                      // masuk akal selagi payslip-nya SENDIRI masih Draft
                      // DAN periode induknya masih Draft (backend update()
                      // ngeblock Published/Submitted/Approved - guard di
                      // sini murni sembunyikan aksi yang bakal gagal, bukan
                      // satu-satunya lapisan).
                      render: (row) =>
                        row.status === 'Draft' && period.status === 'Draft' ? (
                          <PermissionGate code="payslip.update">
                            <button
                              type="button"
                              onClick={() => setSituationalTargetPayslip(row)}
                              aria-label={`Tambah item Situasional untuk ${row.employee?.full_name ?? 'karyawan ini'}`}
                              className="rounded-sm p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                            >
                              <Plus size={14} strokeWidth={2} />
                            </button>
                          </PermissionGate>
                        ) : null,
                    },
                  ]}
                />
              </div>
            </Card>
          </div>
        )}

        <ConfirmDialog
          open={!!actionKind}
          onConfirm={handleActionConfirm}
          onCancel={() => setActionKind(null)}
          title={actionKind ? ACTION_CONFIG[actionKind].title : ''}
          description={period ? `${period.period_code} - ${periodTypeLabel(period.period_type)}` : ''}
          variant={actionKind ? ACTION_CONFIG[actionKind].variant : 'default'}
          confirmLabel={actionKind ? ACTION_CONFIG[actionKind].confirmLabel : undefined}
          reasonLabel={actionKind ? ACTION_CONFIG[actionKind].reasonLabel : undefined}
          isConfirming={isActing}
        />

        <PayslipSituationalItemModal
          open={!!situationalTargetPayslip}
          onClose={() => setSituationalTargetPayslip(null)}
          payslip={situationalTargetPayslip}
          payrollPeriodId={periodId}
          onSuccess={(message) => setToast({ variant: 'success', message })}
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
