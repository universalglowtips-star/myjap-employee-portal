import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface LabelProps {
  /**
   * Default 'label' (field form, WAJIB pasang `htmlFor`). 'p' buat
   * konteks tanpa field terkait (judul KPI card, caption read-only) -
   * visual IDENTIK, cuma tag semantik beda karena gak ada input yang
   * diasosiasikan.
   */
  as?: 'label' | 'p'
  htmlFor?: string
  className?: string
  children: ReactNode
}

/**
 * Extract dari pola yang di-copy-paste manual persis sama (73 kali,
 * 14 file) di seluruh project: `font-body text-[13px] font-medium
 * text-neutral-600`. Nilai 13px SENGAJA tetap arbitrary value (bukan
 * `text-sm` Tailwind, yang defaultnya 14px) - itu nilai asli dari
 * design-system/tokens.json (typography.size.sm = 13), yang sekarang
 * SUDAH dikoreksi jadi 14 supaya cocok skala Tailwind bawaan - komponen
 * ini SENGAJA gak ikut berubah, biar output visual 100% sama kayak
 * sebelumnya (tugas ini murni ekstraksi komponen, BUKAN redesign).
 */
export function Label({ as = 'label', htmlFor, className, children }: LabelProps) {
  const classes = cn('font-body text-[13px] font-medium text-neutral-600', className)

  if (as === 'p') {
    return <p className={classes}>{children}</p>
  }

  return (
    <label htmlFor={htmlFor} className={classes}>
      {children}
    </label>
  )
}
