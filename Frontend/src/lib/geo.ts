/**
 * Haversine formula - replika 1:1 dari
 * AttendanceController::distanceInMeters() (backend), supaya jarak
 * yang dihitung di frontend (auto-pilih kantor terdekat + peringatan
 * radius saat Absen Masuk/Pulang, Task 9.5) cocok dengan yang dipakai
 * backend buat set is_valid_location. earthRadius SAMA PERSIS:
 * 6.371.000 meter.
 */
export function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadius = 6371000

  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadius * c
}
