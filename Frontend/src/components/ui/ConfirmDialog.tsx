import { useEffect, useId, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Label } from './Label'
import { Textarea } from './Textarea'

interface ConfirmDialogProps {
  open: boolean
  /** Reason cuma terisi kalau prop `reasonLabel` dipasang (lihat di bawah) - selain itu selalu undefined, callers lama gak perlu ubah signature. */
  onConfirm: (reason?: string) => void
  onCancel: () => void
  title: string
  description: string
  /** default = aksi biasa (Button primary), danger = aksi destruktif kayak delete (Button danger). */
  variant?: 'default' | 'danger'
  confirmLabel?: string
  cancelLabel?: string
  /** Loading dipetakan ke Button (yang cuma type-safe buat variant primary - lihat Button.tsx Langkah 5), jadi kalau variant='danger' loading TIDAK dipasang ke tombol Confirm (batasan yang sudah disepakati sebelumnya, bukan bug baru). */
  isConfirming?: boolean
  /**
   * Kalau diisi, tampilkan Textarea WAJIB diisi di bawah description -
   * tombol Confirm disabled sampai isinya gak kosong, valuenya dikirim
   * lewat onConfirm(reason). Ditambahkan sekarang (Task 11, Leave
   * reject/cancel yang backend-nya mewajibkan approval_notes/
   * cancel_reason) - persis kebutuhan yang diantisipasi komentar lama
   * di sini ("kebutuhan spesifik Reject Payroll Period... ditambahkan
   * nanti kalau memang dibutuhkan nyata"), sekarang genuinely dibutuhkan
   * di tempat lain juga, bukan cuma Payroll.
   */
  reasonLabel?: string
}

/**
 * Compose Modal (bukan duplikasi focus-trap/portal), role="alertdialog"
 * - semantic lebih tepat buat konfirmasi aksi dibanding "dialog" biasa.
 */
export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  variant = 'default',
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  isConfirming = false,
  reasonLabel,
}: ConfirmDialogProps) {
  const reasonId = useId()
  const [reason, setReason] = useState('')

  // Reset tiap kali dialog dibuka - ConfirmDialog dipanggil beberapa
  // tempat TETAP di-mount (cuma `open` yang toggle, bukan unmount-remount),
  // jadi state reason gak otomatis kosong lagi tanpa effect ini.
  useEffect(() => {
    if (open) setReason('')
  }, [open])

  const reasonMissing = !!reasonLabel && reason.trim().length === 0

  return (
    <Modal
      open={open}
      // Escape/klik-backdrop di Modal SELALU manggil prop onClose ini
      // (gak ada guard isConfirming bawaan di Modal.tsx - itu Shared UI,
      // sengaja gak disentuh). Fix di-scope LOKAL di sini: substitusi
      // onClose jadi no-op selagi isConfirming true, jadi Escape/backdrop
      // otomatis gak ngapa-ngapain tanpa perlu Modal.tsx tau konsep
      // "isConfirming" sama sekali.
      onClose={isConfirming ? () => {} : onCancel}
      title={title}
      role="alertdialog"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={isConfirming}>
            {cancelLabel}
          </Button>
          {variant === 'danger' ? (
            <Button variant="danger" onClick={() => onConfirm(reasonLabel ? reason : undefined)} disabled={isConfirming || reasonMissing}>
              {confirmLabel}
            </Button>
          ) : isConfirming ? (
            // Button.tsx (Langkah 5): `loading: true` TIDAK BOLEH dibarengi
            // `disabled` (dibatasi di level TIPE, bukan cuma konvensi) -
            // dipisah 2 cabang render (bukan `disabled={reasonMissing}`
            // dibarengi `loading={isConfirming}`) supaya tetap type-safe.
            <Button variant="primary" loading onClick={() => onConfirm(reasonLabel ? reason : undefined)}>
              {confirmLabel}
            </Button>
          ) : (
            <Button variant="primary" disabled={reasonMissing} onClick={() => onConfirm(reasonLabel ? reason : undefined)}>
              {confirmLabel}
            </Button>
          )}
        </>
      }
    >
      <p className="font-body text-sm text-neutral-600">{description}</p>
      {reasonLabel && (
        <div className="mt-3 flex flex-col gap-1.5">
          <Label htmlFor={reasonId}>{reasonLabel}</Label>
          <Textarea id={reasonId} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}
    </Modal>
  )
}
