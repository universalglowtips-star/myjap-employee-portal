import { formatDate } from './formatDate'

/** Pola parsing defensif SAMA PERSIS formatDate.ts - timestamp Eloquent bisa serialize "Y-m-d H:i:s" (spasi) ATAU ISO "...T...Z" tergantung konteks, .replace(' ','T') no-op kalau udah ISO. */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return dateString

  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 60) return 'Baru saja'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} menit lalu`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} jam lalu`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay} hari lalu`

  // Lebih dari seminggu - tanggal absolut lebih informatif daripada "X hari lalu" yang terus membesar.
  return formatDate(dateString)
}
