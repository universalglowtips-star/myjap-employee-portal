import { Download } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { formatCurrency } from '../../../lib/formatCurrency'
import { formatNumber } from '../../../lib/formatNumber'
import { formatMonthYear } from '../lib/payslipFormat'
import { usePayslip } from '../hooks/usePayslip'
import { useDownloadPayslipPdf } from '../hooks/useDownloadPayslipPdf'
import type { PayslipItem } from '../../../api/types/payslip'

interface PayslipDetailModalProps {
  payslipId: number | null
  onClose: () => void
  /** Admin/HRD/Finance/Director/Manager lihat nama karyawan di header (bisa lihat milik siapapun) - Karyawan sendiri gak perlu (jelas ini punya sendiri). */
  showEmployeeName?: boolean
}

/**
 * Task 15b (gap Fase 2 C.6+E.3, ditutup belakangan) - rate/quantity
 * CUMA terisi buat item kategori scheduled_variable (Uang Harian, Bonus
 * DLV dst) - item fixed/situational selalu null, tampil polos kayak
 * sebelumnya. Baris di-stack 2 tingkat (BUKAN 1 baris justify-between
 * kayak sebelumnya) - formula "Rp55.000 x 25 = Rp1.375.000" jauh lebih
 * panjang dari nominal polos, stack vertikal ini yang paling aman dari
 * potongan/overflow di layar 390px tanpa perlu breakpoint khusus.
 * TIDAK ada label satuan ("HK"/"Resi") - gak ada kolom buat nyimpen itu
 * di data model, dipaksain nebak dari nama komponen bakal jadi rapuh
 * begitu ada komponen scheduled_variable baru yang polanya beda.
 */
function ItemRow({ item }: { item: PayslipItem }) {
  const hasBreakdown = item.rate !== null && item.quantity !== null

  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <div className="flex items-start justify-between gap-3">
        <span className="font-body text-sm text-neutral-900">{item.component_name}</span>
        <span className="font-mono text-sm text-neutral-900 text-right">{formatCurrency(item.amount)}</span>
      </div>
      {hasBreakdown && (
        <p className="text-right font-mono text-xs text-neutral-600">
          {formatCurrency(item.rate as string)} &times; {formatNumber(item.quantity as string)} = {formatCurrency(item.amount)}
        </p>
      )}
    </div>
  )
}

/**
 * Detail slip gaji (Task 12 Bagian C) - pola sama persis
 * AuditLogDetailModal.tsx (Modal + fetch on-demand by id, bukan modal
 * generik nerima seluruh object). Breakdown earning DULU baru
 * deduction (instruksi eksplisit tugas), item diambil dari
 * `items` (snapshot component_name/type, BUKAN join live ke
 * salary_components - dikonfirmasi investigasi Task 12).
 *
 * TIDAK ADA tombol apapun selain Download PDF - view-only murni,
 * publish/unpublish/edit/delete di luar scope Task 12 walau
 * PayslipController.php punya method-nya.
 */
export function PayslipDetailModal({ payslipId, onClose, showEmployeeName = false }: PayslipDetailModalProps) {
  const { data: payslip, isLoading, isError } = usePayslip(payslipId)
  const downloadMutation = useDownloadPayslipPdf()

  const earnings = (payslip?.items ?? []).filter((i) => i.component_type === 'earning').sort((a, b) => a.sort_order - b.sort_order)
  const deductions = (payslip?.items ?? []).filter((i) => i.component_type === 'deduction').sort((a, b) => a.sort_order - b.sort_order)

  function handleDownload() {
    if (!payslip) return
    const employeeName = payslip.employee?.full_name ?? 'karyawan'
    downloadMutation.mutate({
      id: payslip.id,
      filenameFallback: `Slip-Gaji-${employeeName.replace(/ /g, '-')}-${String(payslip.month).padStart(2, '0')}-${payslip.year}.pdf`,
    })
  }

  return (
    <Modal open={payslipId !== null} onClose={onClose} title="Detail Slip Gaji">
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-sm bg-neutral-100" aria-hidden="true" />
      ) : isError || !payslip ? (
        <p className="font-body text-sm text-status-rejected">Gagal memuat detail slip gaji.</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            {showEmployeeName && (
              <div className="flex flex-col gap-0.5">
                <span className="font-body text-xs text-neutral-500">Nama Karyawan</span>
                <span className="font-body text-sm text-neutral-900">{payslip.employee?.full_name ?? '-'}</span>
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="font-body text-xs text-neutral-500">Periode</span>
              <span className="font-body text-sm text-neutral-900">{formatMonthYear(payslip.month, payslip.year)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-body text-xs text-neutral-500">Status</span>
              <StatusBadge status={payslip.status} />
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-sm border border-neutral-200 p-3">
            <p className="mb-1 font-body text-xs font-semibold text-neutral-600">Pendapatan</p>
            {earnings.length === 0 ? (
              <p className="font-body text-sm text-neutral-600">Tidak ada rincian pendapatan.</p>
            ) : (
              earnings.map((item) => <ItemRow key={item.id} item={item} />)
            )}
            <div className="mt-1 flex items-center justify-between border-t border-neutral-200 pt-1.5">
              <span className="font-body text-sm font-semibold text-neutral-900">Total Pendapatan</span>
              <span className="font-mono text-sm font-semibold text-neutral-900">{formatCurrency(payslip.gross_earning)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-sm border border-neutral-200 p-3">
            <p className="mb-1 font-body text-xs font-semibold text-neutral-600">Potongan</p>
            {deductions.length === 0 ? (
              <p className="font-body text-sm text-neutral-600">Tidak ada rincian potongan.</p>
            ) : (
              deductions.map((item) => <ItemRow key={item.id} item={item} />)
            )}
            <div className="mt-1 flex items-center justify-between border-t border-neutral-200 pt-1.5">
              <span className="font-body text-sm font-semibold text-neutral-900">Total Potongan</span>
              <span className="font-mono text-sm font-semibold text-neutral-900">{formatCurrency(payslip.total_deduction)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-sm bg-neutral-50 p-3">
            <span className="font-body text-sm font-semibold text-neutral-900">Gaji Bersih (Netto)</span>
            <span className="font-mono text-base font-semibold text-neutral-900">{formatCurrency(payslip.net_salary)}</span>
          </div>

          {downloadMutation.isError && (
            <p role="alert" className="font-body text-sm text-status-rejected">
              Gagal mengunduh PDF. Coba lagi.
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={handleDownload} loading={downloadMutation.isPending}>
              <Download size={16} strokeWidth={2} aria-hidden="true" />
              Download PDF
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
