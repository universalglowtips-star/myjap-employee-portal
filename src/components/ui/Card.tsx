import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/**
 * Container generik - padding 24px (spacing/lg), radius/md, shadow/sm,
 * bg/surface, persis dari Figma. TIDAK mengandung logic apapun soal
 * isinya (StatCard, form section, dst semua cuma composition di luar
 * Card ini, bukan variant/prop khusus di dalam Card sendiri).
 */
export function Card({ children, className, ...rest }: CardProps) {
  return (
    <div
      className={cn('rounded-md bg-white p-6 shadow-sm', className)}
      {...rest}
    >
      {children}
    </div>
  )
}
