import { cn } from '../../lib/cn'

type AvatarSize = 'small' | 'default' | 'large'

interface AvatarProps {
  /** Full name karyawan - inisial diambil dari sini, komponen TIDAK fetch data sendiri. */
  name: string
  size?: AvatarSize
  className?: string
}

const sizeClass: Record<AvatarSize, string> = {
  small: 'h-7 w-7 text-xs',
  default: 'h-9 w-9 text-sm',
  large: 'h-12 w-12 text-lg',
}

/**
 * Persis logic yang didokumentasikan di Figma: 2 huruf pertama dari
 * full_name. Untuk nama multi-kata, ambil huruf pertama dari 2 kata
 * pertama (Ahmad Bagus -> AB). Untuk nama 1 kata, ambil 2 huruf
 * pertama dari kata itu sendiri (Ahmad -> AH) - BUKAN cuma 1 huruf,
 * karena "2 huruf pertama" tetap berlaku walau cuma ada 1 kata.
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length <= 1) {
    return (parts[0] ?? '').slice(0, 2).toUpperCase()
  }

  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase()
}

export function Avatar({ name, size = 'default', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-primary-600 font-semibold font-body text-white',
        sizeClass[size],
        className
      )}
      title={name}
    >
      {getInitials(name)}
    </div>
  )
}
