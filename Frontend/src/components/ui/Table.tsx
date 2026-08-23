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
 * di layar Payroll Period Detail): row data 33px/padding 8/8/Inter
 * Regular 13px primary, border-bottom 1px color/border/default.
 *
 * Header: background solid bg-primary-600 (#0066FF) + teks putih -
 * revisi dari header abu-abu polos sebelumnya, sesuai Arahan Visual
 * Bagian 1 ("header background solid berwarna, bukan cuma teks abu-
 * abu"). Kontras teks putih vs #0066FF = 4.83:1, dihitung pakai
 * formula WCAG standar, lolos ambang AA normal text (4.5:1). px-3
 * ditambahkan barengan (th & td) - sebelumnya 0 padding horizontal,
 * aman waktu header cuma teks mengambang, begitu jadi bar warna solid
 * teks bakal nempel tanpa jarak kalau gak dikasih padding.
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
                // Header background solid biru (bg-primary-600) - teks
                // putih, KONTRAS 4.83:1 terhadap #0066FF (dihitung
                // pakai formula WCAG standar), lolos ambang AA normal
                // text 4.5:1. px-3 ditambahkan bareng perubahan ini -
                // sebelumnya th/td 0 padding horizontal (aman waktu
                // header cuma teks abu mengambang, begitu jadi bar
                // biru solid teks bakal nempel ke tepi/kolom sebelah
                // tanpa jarak sama sekali).
                'bg-primary-600 px-3 pb-1.5 pt-1.5 font-body text-xs font-medium text-white',
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
                <td key={col.key} className="px-3 py-2">
                  <div className="h-3.5 w-full max-w-[160px] animate-pulse rounded-sm bg-neutral-100" />
                </td>
              ))}
            </tr>
          ))
        ) : data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="px-3 py-8 text-center font-body text-sm text-neutral-400">
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
                      'px-3 py-2 font-body text-sm text-neutral-900',
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
