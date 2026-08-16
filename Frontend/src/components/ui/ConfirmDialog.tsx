import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  description: string
  /** default = aksi biasa (Button primary), danger = aksi destruktif kayak delete (Button danger). */
  variant?: 'default' | 'danger'
  confirmLabel?: string
  cancelLabel?: string
  /** Loading dipetakan ke Button (yang cuma type-safe buat variant primary - lihat Button.tsx Langkah 5), jadi kalau variant='danger' loading TIDAK dipasang ke tombol Confirm (batasan yang sudah disepakati sebelumnya, bukan bug baru). */
  isConfirming?: boolean
}

/**
 * Compose Modal (bukan duplikasi focus-trap/portal), role="alertdialog"
 * - semantic lebih tepat buat konfirmasi aksi dibanding "dialog" biasa.
 *
 * TIDAK ADA prop `requireReason` di versi ini - itu kebutuhan spesifik
 * Reject Payroll Period (Fase E), bukan kebutuhan Fase B (delete Master
 * Data cukup Ya/Tidak polos). Ditambahkan nanti kalau memang dibutuhkan
 * nyata, bukan diantisipasi sekarang.
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
}: ConfirmDialogProps) {
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
            <Button variant="danger" onClick={onConfirm} disabled={isConfirming}>
              {confirmLabel}
            </Button>
          ) : (
            <Button variant="primary" onClick={onConfirm} loading={isConfirming}>
              {confirmLabel}
            </Button>
          )}
        </>
      }
    >
      <p className="font-body text-sm text-neutral-600">{description}</p>
    </Modal>
  )
}
