import { useState } from 'react'
import { X } from 'lucide-react'
import { Select } from '../../../components/ui/Select'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Button } from '../../../components/ui/Button'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toast } from '../../../components/ui/Toast'
import { formatCurrency } from '../../../lib/formatCurrency'
import { usePositions } from '../hooks/usePositions'
import {
  usePositionSalaryComponents,
  useCreatePositionSalaryComponent,
  useDeletePositionSalaryComponent,
} from '../hooks/usePositionSalaryComponents'
import type { NormalizedApiError } from '../../../api/client'

interface SalaryComponentPositionRatesSectionProps {
  salaryComponentId: number
  /** situational SENGAJA gak diterima di sini - gak punya konsep default tersimpan (lihat categoryCaption di SalaryComponentFormModal), caller gak pernah render section ini buat situational. */
  category: 'fixed' | 'scheduled_variable'
}

/**
 * Task 15b - "jabatan mana aja yang dapat komponen ini + berapa
 * nominal/tarif default-nya" (position_salary_components), dikelola
 * dari SINI (bukan dari halaman Posisi) - keputusan D.1, konsisten
 * sama backend SalaryComponentPositionController (lihat komentar di
 * sana): category hidup di SalaryComponent, jadi 1 komponen = 1 layar
 * konfigurasi utuh.
 *
 * Live-list, pola PERSIS EmployeeOfficeScopeTab (Task 8e) - tiap
 * tambah/hapus langsung POST/DELETE seketika (BUKAN dikumpulin ke
 * form state lalu disimpan sekali) - beda cuma di sini butuh 1 field
 * tambahan (amount), jadi "pilih lalu langsung ConfirmDialog" diganti
 * "isi kecil (Select + Input) + tombol Tambah" dulu baru ConfirmDialog.
 */
export function SalaryComponentPositionRatesSection({ salaryComponentId, category }: SalaryComponentPositionRatesSectionProps) {
  const { data: positions } = usePositions()
  const { data: rates, isLoading, isError } = usePositionSalaryComponents(salaryComponentId)
  const createMutation = useCreatePositionSalaryComponent(salaryComponentId)
  const deleteMutation = useDeletePositionSalaryComponent(salaryComponentId)

  const [selectedPositionId, setSelectedPositionId] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [pendingAdd, setPendingAdd] = useState<{ positionId: number; positionName: string; amount: number } | null>(null)
  const [pendingRemove, setPendingRemove] = useState<{ positionId: number; positionName: string } | null>(null)
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null)

  const amountLabel = category === 'scheduled_variable' ? 'Tarif per Jabatan' : 'Nominal per Jabatan'
  const amountUnitHint = category === 'scheduled_variable' ? ' (per unit Jumlah, mis. per Hari/per Resi)' : ''

  const ratedPositionIds = new Set((rates ?? []).map((r) => r.position_id))
  const availableOptions = (positions ?? [])
    .filter((p) => !ratedPositionIds.has(p.id))
    .map((p) => ({ value: String(p.id), label: p.position_name }))

  function handleOpenAddConfirm() {
    const position = (positions ?? []).find((p) => String(p.id) === selectedPositionId)
    const amount = Number(amountInput)
    if (!position || Number.isNaN(amount) || amount < 0) return
    setPendingAdd({ positionId: position.id, positionName: position.position_name, amount })
  }

  async function handleConfirmAdd() {
    if (!pendingAdd) return
    try {
      await createMutation.mutateAsync({ position_id: pendingAdd.positionId, amount: pendingAdd.amount })
      setToast({ variant: 'success', message: `${amountLabel} untuk jabatan "${pendingAdd.positionName}" berhasil disimpan.` })
      setSelectedPositionId('')
      setAmountInput('')
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setPendingAdd(null)
    }
  }

  async function handleConfirmRemove() {
    if (!pendingRemove) return
    try {
      await deleteMutation.mutateAsync(pendingRemove.positionId)
      setToast({ variant: 'success', message: `Jabatan "${pendingRemove.positionName}" berhasil dicabut dari komponen ini.` })
    } catch (err) {
      const apiError = err as NormalizedApiError
      setToast({ variant: 'error', message: apiError.message })
    } finally {
      setPendingRemove(null)
    }
  }

  return (
    <div className="mt-6 border-t border-neutral-200 pt-4">
      <Label as="p">{amountLabel}</Label>
      <p className="mt-1 font-body text-xs text-neutral-600">
        Jabatan yang tidak terdaftar di sini TIDAK mendapat komponen ini sama sekali (bukan dapat Rp 0).
      </p>

      {isError ? (
        <p className="mt-3 font-body text-sm text-status-rejected">Data jabatan untuk komponen ini gagal dimuat.</p>
      ) : isLoading ? (
        <p className="mt-3 font-body text-sm text-neutral-600">Memuat...</p>
      ) : (rates ?? []).length === 0 ? (
        <p className="mt-3 font-body text-sm text-neutral-600">Belum ada jabatan yang diatur untuk komponen ini.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {(rates ?? []).map((rate) => (
            <li
              key={rate.id}
              className="flex items-center justify-between gap-2 rounded-sm bg-neutral-50 px-3 py-2 font-body text-sm text-neutral-900"
            >
              <span>{rate.position?.position_name ?? `Jabatan #${rate.position_id}`}</span>
              <span className="flex items-center gap-2">
                <span className="font-mono">{formatCurrency(rate.amount)}</span>
                <button
                  type="button"
                  onClick={() =>
                    setPendingRemove({
                      positionId: rate.position_id,
                      positionName: rate.position?.position_name ?? `Jabatan #${rate.position_id}`,
                    })
                  }
                  aria-label={`Cabut ${rate.position?.position_name ?? `Jabatan #${rate.position_id}`} dari komponen ini`}
                  className="rounded-sm p-1 text-neutral-400 hover:bg-neutral-200 hover:text-status-rejected"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add_position_rate_position">Jabatan</Label>
          <Select
            id="add_position_rate_position"
            className="py-2"
            value={selectedPositionId}
            options={availableOptions}
            placeholder={availableOptions.length === 0 ? 'Semua jabatan sudah diatur' : 'Pilih Jabatan'}
            disabled={availableOptions.length === 0}
            onChange={(e) => setSelectedPositionId(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add_position_rate_amount">Jumlah (Rp){amountUnitHint}</Label>
          <Input
            id="add_position_rate_amount"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            className="w-40 py-2"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleOpenAddConfirm}
          disabled={!selectedPositionId || amountInput === '' || createMutation.isPending}
        >
          Tambah
        </Button>
      </div>

      <ConfirmDialog
        open={!!pendingAdd}
        onCancel={() => setPendingAdd(null)}
        onConfirm={handleConfirmAdd}
        title={`Tambah ${amountLabel}`}
        description={pendingAdd ? `Jabatan "${pendingAdd.positionName}" akan dapat ${formatCurrency(pendingAdd.amount)} untuk komponen ini. Lanjutkan?` : ''}
        confirmLabel="Ya, Simpan"
        isConfirming={createMutation.isPending}
      />

      <ConfirmDialog
        open={!!pendingRemove}
        onCancel={() => setPendingRemove(null)}
        onConfirm={handleConfirmRemove}
        title="Cabut Jabatan"
        description={`Jabatan "${pendingRemove?.positionName}" tidak akan lagi mendapat komponen ini. Lanjutkan?`}
        variant="danger"
        confirmLabel="Ya, Cabut"
        isConfirming={deleteMutation.isPending}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 w-80">
          <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} duration={4000} />
        </div>
      )}
    </div>
  )
}
