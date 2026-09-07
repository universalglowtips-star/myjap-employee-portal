import { useEffect, useRef, useState } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { Button } from '../../../components/ui/Button'

export type AttendanceExportFormat = 'csv' | 'excel' | 'pdf'

interface AttendanceExportMenuProps {
  disabled?: boolean
  onExport: (format: AttendanceExportFormat) => void
}

const FORMAT_OPTIONS: { format: AttendanceExportFormat; label: string }[] = [
  { format: 'csv', label: 'CSV' },
  { format: 'excel', label: 'Excel' },
  { format: 'pdf', label: 'PDF' },
]

/**
 * Dropdown tombol "Ekspor" (Task 10 Bagian C) - pola click-outside +
 * Escape + role="menu"/"menuitem" PERSIS SAMA kayak user menu Topbar.tsx
 * (satu-satunya dropdown-menu yang sudah ada di app ini), bukan pola baru.
 */
export function AttendanceExportMenu({ disabled, onExport }: AttendanceExportMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  function handleSelect(format: AttendanceExportFormat) {
    setOpen(false)
    onExport(format)
  }

  return (
    <div ref={menuRef} className="relative">
      <Button
        variant="secondary"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download size={16} strokeWidth={2} />
        Ekspor
        <ChevronDown size={14} strokeWidth={2} />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-2 w-36 rounded-sm border border-neutral-200 bg-white py-1 shadow-md"
        >
          {FORMAT_OPTIONS.map((option) => (
            <button
              key={option.format}
              type="button"
              role="menuitem"
              onClick={() => handleSelect(option.format)}
              className="flex w-full items-center px-3 py-2 text-left font-body text-sm text-neutral-900 hover:bg-neutral-50"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
