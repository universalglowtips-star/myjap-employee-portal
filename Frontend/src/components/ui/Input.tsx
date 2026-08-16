import type { InputHTMLAttributes } from 'react'
import { forwardRef, useId } from 'react'
import { cn } from '../../lib/cn'

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  /** String pesan error - kalau diisi, border+teks jadi merah (border/status-rejected) + pesan muncul di bawah. */
  error?: string
  className?: string
}

/**
 * CATATAN JUJUR (wajib dilaporkan sesuai kesepakatan Langkah 5):
 * Elemen PESAN ERROR di bawah field ini adalah REACT COMPOSITION/
 * ACCESSIBILITY EXTENSION - Figma "State=Error" cuma nunjukin field
 * dengan border+teks merah, TIDAK ADA elemen pesan terpisah di
 * bawahnya (sudah dicek langsung ke children Figma waktu audit,
 * cuma 1 elemen: field itu sendiri). Pesan error di bawah ini murni
 * ditambahkan supaya `aria-describedby` punya sesuatu buat di-point,
 * pakai token TYPOGRAPHY YANG SUDAH ADA (text-xs = Body/Caption 12px)
 * + WARNA yang sudah ada (color/status/rejected) - TIDAK ada visual
 * language atau token baru yang dibuat.
 *
 * Focus (border 2px + color/border/focus) dan Disabled (opacity 0.5)
 * dari Figma dipetakan ke pseudo-class CSS NATIVE (:focus, :disabled)
 * - bukan React state manual, karena itu memang state HTML asli.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, className, id, ...rest },
  ref
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          // Lebar: Figma nunjukin 280px FIXED, tapi itu artefak ukuran
          // frame contoh (Login form), bukan aturan "Input harus selalu
          // 280px" - w-full (ngikutin parent) jauh lebih masuk akal
          // buat komponen reusable. Ditandai eksplisit di laporan.
          'w-full rounded-sm border px-4 py-2.5 text-sm font-body text-neutral-900',
          'placeholder:text-neutral-400',
          'focus:outline-none focus:border-2 focus:border-primary-600',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:text-neutral-400',
          error ? 'border-status-rejected' : 'border-neutral-200',
          className
        )}
        {...rest}
      />
      {error && (
        <p id={errorId} className="text-xs font-body text-status-rejected">
          {error}
        </p>
      )}
    </div>
  )
})
