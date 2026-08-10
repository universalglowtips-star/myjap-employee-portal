export function formatDate(date: string | null | undefined, withTime = false): string {
  if (!date) return '-'
  const d = new Date(date.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return date

  const dateStr = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)

  if (!withTime) return dateStr

  const timeStr = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)

  return `${dateStr}, ${timeStr}`
}
