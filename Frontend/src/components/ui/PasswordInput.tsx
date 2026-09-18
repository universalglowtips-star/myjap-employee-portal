import type { InputHTMLAttributes } from 'react'
import { forwardRef, useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/cn'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'> {
  /** String pesan error - kalau diisi, border+teks jadi merah (border/status-rejected) + pesan muncul di bawah. */
  error?: string
  className?: string
  /** Nama field buat aria-label tombol toggle ("Tampilkan {fieldLabel}"/"Sembunyikan {fieldLabel}") - default "password". Diparameterkan (bukan di-hardcode) karena tiap tempat pakai istilah field yang beda (LoginPage label-nya "Kata Sandi", EmployeeFormPage "Password") - aria-label tombol toggle ikut istilah Label yang berdampingan, bukan generik semua. */
  fieldLabel?: string
}

/**
 * Input password + tombol show/hide (ikon mata), dipakai LoginPage dan
 * EmployeeFormPage (Tambah/Edit Karyawan) - sebelumnya toggle ini cuma
 * ada di LoginPage, ditambal manual pakai <div relative> + posisi
 * pixel-offset yang nebak tinggi Input (rapuh kalau ditempel ulang di
 * konteks lain). Di sini <div relative> cuma bungkus <input> mentah
 * (BUKAN <Input> yang sudah include paragraf error di dalamnya), jadi
 * `top-1/2 -translate-y-1/2` selalu center ke baris input beneran,
 * terlepas dari ada/tidaknya pesan error di bawahnya.
 *
 * showPassword state lokal ke komponen ini - murni visual, gak
 * menyentuh cara value dikirim (masih <input type="password"> asli
 * saat disembunyikan, browser password-manager tetap jalan normal).
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { error, className, id, fieldLabel = 'password', ...rest },
  ref
) {
  const [showPassword, setShowPassword] = useState(false)
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={showPassword ? 'text' : 'password'}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full rounded-sm border px-4 py-2.5 pr-10 text-sm font-body text-neutral-900',
            'placeholder:text-neutral-400',
            'focus:outline-none focus:border-2 focus:border-primary-600',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:text-neutral-400',
            error ? 'border-status-rejected' : 'border-neutral-200',
            className
          )}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? `Sembunyikan ${fieldLabel}` : `Tampilkan ${fieldLabel}`}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none focus-visible:text-primary-600"
        >
          {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
        </button>
      </div>
      {error && (
        <p id={errorId} className="text-xs font-body text-status-rejected">
          {error}
        </p>
      )}
    </div>
  )
})
