import type { SelectHTMLAttributes } from 'react'
import { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'children'> {
  options: SelectOption[]
  /** Dirender sebagai <option value="" disabled hidden> - cuma buat state awal, gak bisa dipilih balik setelah value lain kepilih. */
  placeholder?: string
  /** Sama persis pola Input.tsx - kalau diisi, border+teks jadi merah (border/status-rejected) + pesan muncul di bawah. */
  error?: string
  className?: string
}

/**
 * Native <select> murni - bukan custom combobox/dropdown. Tidak ada
 * open/close state, keyboard handler, portal, atau positioning manual;
 * semua interaksi (klik, panah atas/bawah, Tab, Escape, jump-to-option
 * huruf pertama) 100% ditangani browser.
 *
 * Styling menyalin nilai literal Input.tsx (py-2.5/px-4/text-sm/
 * rounded-sm/border-neutral-200/focus:border-primary-600/dst) - bukan
 * token baru. appearance-none + ChevronDown cuma restyle visual,
 * semantics <select> tidak berubah sama sekali.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, error, className, id, ...rest },
  ref
) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = `${selectId}-error`

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full appearance-none rounded-sm border px-4 py-2.5 pr-9 text-sm font-body text-neutral-900',
            'focus:outline-none focus:border-2 focus:border-primary-600',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:text-neutral-400',
            error ? 'border-status-rejected' : 'border-neutral-200',
            className
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
        />
      </div>
      {error && (
        <p id={errorId} className="text-xs font-body text-status-rejected">
          {error}
        </p>
      )}
    </div>
  )
})
