import { useEffect } from 'react'
import { cn } from '../../lib/cn'

type ToastVariant = 'success' | 'error' | 'warning'

interface ToastProps {
  variant: ToastVariant
  message: string
  onDismiss: () => void
  /** Kalau diisi, auto-dismiss setelah N ms. Default TIDAK auto-dismiss (undefined) - biar user gak kehilangan kesempatan baca pesan sebelum sempat merhatiin. Caller yang putuskan durasi kalau memang mau auto-dismiss. */
  duration?: number
}

const variantClass: Record<ToastVariant, string> = {
  success: 'border-l-4 border-l-status-approved text-status-approved',
  error: 'border-l-4 border-l-status-rejected text-status-rejected',
  warning: 'border-l-4 border-l-status-pending text-status-pending',
}

/**
 * Primitive REUSABLE - bukan global toast manager/queue/context.
 * Caller yang tanggung jawab render kondisional + posisi (fixed
 * bottom-right dsb) + nyimpen state open/closed. Ini cuma "kartu
 * notifikasi 1 pesan", dipanggil ulang seperlunya.
 *
 * IMPLEMENTATION DECISION (BUKAN dari Figma - ditegaskan ulang,
 * audit sebelumnya sudah konfirmasi nol referensi Figma untuk Toast):
 * pola border-left 4px per varian itu keputusan implementasi saya
 * sendiri, warnanya token asli (color/status/*) tapi POLA
 * visualnya (border-left sebagai indikator varian) tidak berasal
 * dari spec manapun.
 */
export function Toast({ variant, message, onDismiss, duration }: ToastProps) {
  useEffect(() => {
    if (!duration) return
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  // ARIA yang benar: role="alert" utk error (implisit aria-live="assertive"+atomic,
  // paling tepat buat pesan urgent) - role="status" utk success/warning
  // (implisit aria-live="polite", gak interupsi user). Sebelumnya SALAH:
  // selalu role="status" + override manual aria-live="assertive" buat
  // error - itu kombinasi non-standar (role="status" secara ARIA
  // spec implisit "polite", nimpa manual jadi "assertive" itu gak
  // konsisten sama role-nya sendiri).
  const role = variant === 'error' ? 'alert' : 'status'
  const ariaLive = variant === 'error' ? 'assertive' : 'polite'

  return (
    <div
      role={role}
      aria-live={ariaLive}
      className={cn(
        'flex items-start justify-between gap-3 rounded-sm bg-white px-4 py-3 shadow-md',
        variantClass[variant]
      )}
    >
      <p className="font-body text-sm text-neutral-900">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Tutup notifikasi"
        className="shrink-0 font-body text-sm text-neutral-400 hover:text-neutral-600"
      >
        ✕
      </button>
    </div>
  )
}
