import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface TableColumn<T> {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  /** Kolom angka (Rupiah, ID, dst) pakai JetBrains Mono - konsisten sama pola yang udah dipakai di seluruh Figma. */
  mono?: boolean
  render: (row: T) => ReactNode
}

interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  selectedRowKey?: string | number
  isLoading?: boolean
  emptyMessage?: string
}

/**
 * REFERENSI VISUAL (bukan component Figma resmi - Figma gak punya
 * "Table" sebagai component, ini pola yang diaudit dari tabel Payslip
 * di layar Payroll Period Detail): header 28px/padding 6/6/Inter
 * Medium 12px muted, row data 33px/padding 8/8/Inter Regular 13px
 * primary, border-bottom 1px color/border/default.
 *
 * 5 state sesuai brief: Default (row biasa), Hover (:hover CSS
 * native, bukan React state), Selected (prop selectedRowKey, bg
 * primary-50), Empty (data.length===0), Loading (skeleton pulse).
 */
export function Table<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  selectedRowKey,
  isLoading = false,
  emptyMessage = 'Tidak ada data.',
}: TableProps<T>) {
  const alignClass = (align?: 'left' | 'right' | 'center') =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              scope="col"
              className={cn(
                'pb-1.5 pt-1.5 font-body text-xs font-medium text-neutral-400',
                alignClass(col.align)
              )}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <tr key={`skeleton-${i}`} className="border-t border-neutral-200">
              {columns.map((col) => (
                <td key={col.key} className="py-2">
                  <div className="h-3.5 w-full max-w-[160px] animate-pulse rounded-sm bg-neutral-100" />
                </td>
              ))}
            </tr>
          ))
        ) : data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="py-8 text-center font-body text-sm text-neutral-400">
              {emptyMessage}
            </td>
          </tr>
        ) : (
          data.map((row) => {
            const key = rowKey(row)
            const isSelected = selectedRowKey !== undefined && key === selectedRowKey
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        // Enter dan Space - dua-duanya konvensi standar buat "aktivasi" elemen interaktif via keyboard.
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  'border-t border-neutral-200',
                  onRowClick && 'cursor-pointer hover:bg-neutral-50 focus:outline-none focus:bg-neutral-50',
                  isSelected && 'bg-primary-50'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'py-2 font-body text-sm text-neutral-900',
                      col.mono && 'font-mono',
                      alignClass(col.align)
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            )
          })
        )}
      </tbody>
    </table>
  )
}
