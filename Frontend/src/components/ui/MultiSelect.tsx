import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  id?: string
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
}

/**
 * Belum ada pola dropdown multi-select (buka/tutup popover) di project
 * ini - yang paling deket cuma checklist SELALU-TERBUKA di Tab Supervisor
 * (OfficeLocationFormModal.tsx, checkbox list biasa tanpa toggle buka/
 * tutup). Isi panelnya SENGAJA direplikasi dari situ (tiap opsi tetap
 * <label><input type="checkbox">, native, gak ada ARIA listbox/option
 * custom yang rawan bug) - yang baru cuma "shell" tombol buka/tutup di
 * luarnya. Bukan reinvent dari nol, cuma nambah 1 lapisan disclosure di
 * atas pola checkbox yang udah terbukti aman kontras & aksesibilitasnya.
 */
export function MultiSelect({ id, options, value, onChange, placeholder, error, disabled, className }: MultiSelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = `${selectId}-error`

  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function toggleOption(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label)
  const summaryText =
    selectedLabels.length === 0
      ? (placeholder ?? 'Pilih opsi')
      : selectedLabels.length <= 2
        ? selectedLabels.join(', ')
        : `${selectedLabels.length} dipilih`

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <div className="relative">
        <button
          ref={triggerRef}
          id={selectId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'w-full rounded-sm border px-4 py-2.5 pr-9 text-left text-sm font-body',
            selectedLabels.length === 0 ? 'text-neutral-600' : 'text-neutral-900',
            'focus:outline-none focus:border-2 focus:border-primary-600',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-status-rejected' : 'border-neutral-200',
            className
          )}
        >
          {summaryText}
        </button>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600"
        />

        {open && (
          <div className="absolute z-20 mt-1 w-full rounded-sm border border-neutral-200 bg-white shadow-lg">
            <div className="max-h-56 overflow-y-auto py-1">
              {options.length === 0 ? (
                <p className="px-4 py-2 font-body text-sm text-neutral-600">Tidak ada opsi.</p>
              ) : (
                options.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 px-4 py-2 hover:bg-neutral-50"
                  >
                    <input
                      type="checkbox"
                      checked={value.includes(option.value)}
                      onChange={() => toggleOption(option.value)}
                      className="h-4 w-4 shrink-0 rounded-sm border-neutral-300 accent-primary-600"
                    />
                    <span className="font-body text-sm text-neutral-900">{option.label}</span>
                  </label>
                ))
              )}
            </div>
            <div className="flex justify-end border-t border-neutral-200 px-2 py-1.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-sm px-2 py-1 font-body text-xs font-medium text-primary-600 hover:bg-neutral-50"
              >
                Selesai
              </button>
            </div>
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-xs font-body text-status-rejected">
          {error}
        </p>
      )}
    </div>
  )
}
