import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'default' | 'small'

/**
 * Style x Size digeneralisasi (disepakati Langkah 5): Style nentuin
 * warna/visual, Size nentuin dimensi/padding - TIDAK ada perubahan
 * typography (font size TETAP 14px di semua Size, dikonfirmasi dari
 * Figma: "Small TIDAK punya font lebih kecil, cuma padding beda").
 *
 * `loading` DIBATASI TIPE ke variant='primary' (atau undefined,
 * default primary) - ini bukan cuma komentar, TypeScript beneran
 * nolak kalau ada yang nyoba `variant="danger" loading` karena cuma
 * Primary+Loading yang punya bukti visual di Figma (disepakati
 * eksplisit: jangan bikin Loading Secondary/Danger/Ghost tanpa approval).
 */
type ButtonBaseProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>

type ButtonProps =
  | (ButtonBaseProps & { loading?: false; disabled?: boolean })
  | (ButtonBaseProps & { loading: true; variant?: 'primary'; disabled?: never })

const variantClass: Record<ButtonVariant, string> = {
  // Warna persis dari Figma (bound variable yang di-resolve waktu audit):
  // color/bg/primary, color/bg/subtle, color/border/default+color/text/primary, color/status/rejected
  primary: 'bg-primary-600 text-white',
  secondary: 'bg-neutral-100 text-neutral-900',
  ghost: 'bg-transparent border border-neutral-200 text-neutral-900',
  danger: 'bg-status-rejected text-white',
}

const sizeClass: Record<ButtonSize, string> = {
  // Padding persis dari Figma: Default 16/8px, Small 10/6px - dikonversi ke unit Tailwind (4px based, cocok persis tanpa perlu token spacing custom)
  default: 'px-4 py-2 text-sm',
  small: 'px-2.5 py-1.5 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-sm font-semibold font-body',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        // :focus-visible native CSS (bukan styling manual) - global rule sudah ada di index.css Langkah 1
        variantClass[variant],
        sizeClass[size],
        loading && 'opacity-75 cursor-wait',
        className
      )}
      {...rest}
    >
      {loading && (
        <span
          className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
}
