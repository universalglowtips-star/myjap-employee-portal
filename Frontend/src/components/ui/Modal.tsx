import type { ReactNode } from 'react'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  /** Default 'dialog'. ConfirmDialog pakai 'alertdialog' (semantic lebih tepat buat konfirmasi aksi, bukan dialog info umum) - reuse Modal ini, bukan duplikasi logic focus-trap/portal. */
  role?: 'dialog' | 'alertdialog'
}

/**
 * Stack modul-level (bukan React state/context) - nyimpen instanceId
 * Modal yang lagi OPEN, urutan push = urutan buka, jadi elemen
 * TERAKHIR di array = modal paling atas/topmost. Ini yang bikin
 * Escape/focus-trap cuma respon di modal topmost pas ada lebih dari
 * 1 Modal kebuka bersamaan (mis. ConfirmDialog di atas Modal form) -
 * tanpa perlu Context Provider/dependency baru, cukup array plain JS
 * yang di-share lewat module scope (semua instance Modal hidup di
 * modul yang sama).
 */
let openModalStack: string[] = []

/**
 * TIDAK ADA referensi Figma untuk komponen ini (dicek eksplisit -
 * nol frame/component bernama Modal/Dialog/Overlay di seluruh file
 * Figma). Implementasi minimal, reusable, pakai token yang sudah
 * ada (bg/surface, radius/lg, Shadow/lg - sama seperti elevasi yang
 * dipakai Card, cuma radius lebih besar buat kesan "mengambang" di
 * atas overlay).
 *
 * Focus trap + restore focus DIBANGUN MANUAL (bukan library) - React
 * built-in aja, sesuai batasan "jangan install dependency baru".
 */
export function Modal({ open, onClose, title, children, footer, role = 'dialog' }: ModalProps) {
  const instanceId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerElementRef = useRef<HTMLElement | null>(null)
  const titleId = `modal-title-${instanceId}`

  useEffect(() => {
    if (!open) return

    // Simpan elemen yang fokus SEBELUM modal dibuka - buat restore focus pas ditutup.
    // Ditangkap per-instance, jadi kalau ini Modal B (dibuka dari
    // dalam Modal A), yang tersimpan itu trigger di DALAM A - bukan
    // trigger asal A - restore focus tetap presisi walau bertumpuk.
    triggerElementRef.current = document.activeElement as HTMLElement

    // Fokus ke panel modal begitu terbuka (bukan ke elemen di belakangnya).
    panelRef.current?.focus()

    openModalStack.push(instanceId)

    function isTopmost() {
      return openModalStack[openModalStack.length - 1] === instanceId
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Modal yang BUKAN topmost diam total - gak respon Escape,
      // gak ikut trap Tab. Ini yang mencegah 1x Escape nutup 2 modal
      // sekaligus, dan mencegah focus trap dua modal saling rebutan.
      if (!isTopmost()) return

      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key !== 'Tab') return

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable || focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      openModalStack = openModalStack.filter((id) => id !== instanceId)
      // Restore focus ke trigger begitu modal ditutup (unmount/close).
      triggerElementRef.current?.focus()
    }
  }, [open, onClose, instanceId])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-neutral-900/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-lg',
          'focus:outline-none'
        )}
      >
        <h2 id={titleId} className="font-display text-lg font-semibold text-neutral-900">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
