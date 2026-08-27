import { useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import { formatDate } from '../../../lib/formatDate'
import { useAttendanceTrend } from '../hooks/useAttendanceTrend'

const DAY_OPTIONS = [7, 14, 30] as const

/**
 * Warna 4 series - REUSE token yang SUDAH diverifikasi aman sebagai
 * teks (bukan --color-success mentah, #2F855A - itu nilai ASLI
 * text-status-approved SEBELUM digelapin karena gagal WCAG AA, lihat
 * comment di index.css baris ~40). Dipakai di sini buat stroke SVG
 * (dekoratif, gak kena rule color-contrast axe sama sekali), tapi
 * tetap pakai versi yang udah diverifikasi (#2A7851/status-approved)
 * biar konsisten sama warna yang sama persis muncul di legend teks
 * card "Kehadiran Hari Ini" - bukan 2 hijau yang beda dikit.
 * on_leave pakai primary-600 (brand blue, established luas) sebagai
 * warna ke-4 karena cuma ada 3 token semantik (success/warning/danger).
 *
 * strokeDasharray beda TIAP series (bukan cuma warna beda) - garis
 * tetap bisa dibedakan pembaca low-vision/color-blind tanpa
 * mengandalkan warna doang, sesuai instruksi aksesibilitas.
 */
const SERIES = [
  { key: 'present', name: 'Hadir', color: '#2A7851', dash: undefined },
  { key: 'late', name: 'Terlambat', color: '#DD6B20', dash: '6 3' },
  { key: 'on_leave', name: 'Cuti/Izin', color: '#0066FF', dash: '2 3' },
  { key: 'absent', name: 'Tidak Hadir', color: '#C53030', dash: '10 4' },
] as const

export function AttendanceTrendChart() {
  const [days, setDays] = useState<number>(7)
  const { data, isLoading, isError } = useAttendanceTrend(days)

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-base font-semibold text-neutral-900">Tren Kehadiran Harian</p>
        <div className="flex gap-1" role="group" aria-label="Rentang hari tren kehadiran">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              className={cn(
                'rounded-sm px-3 py-1.5 font-body text-xs font-medium',
                days === d ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              )}
            >
              {d} Hari
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 h-72 animate-pulse rounded-sm bg-neutral-100" aria-hidden="true" />
      ) : isError ? (
        <p className="mt-4 font-body text-sm text-status-rejected">Gagal memuat tren kehadiran.</p>
      ) : (
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.data ?? []} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEECE6" />
              <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fontSize: 12, fill: '#5C574C' }} />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: '#5C574C' }}
                label={{ value: 'Jumlah', angle: -90, position: 'insideLeft', fill: '#5C574C', fontSize: 12 }}
              />
              <Tooltip
                labelFormatter={(d) => formatDate(String(d))}
                contentStyle={{ fontSize: 13, borderRadius: 6, borderColor: '#DDD9CF', color: '#1A2028' }}
              />
              <Legend wrapperStyle={{ fontSize: 13, color: '#1A2028' }} />
              {SERIES.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray={s.dash}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
