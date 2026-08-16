/**
 * Fungsi murni, ZERO import - sengaja dipisah dari hasPermission()
 * (lib/permissions.ts) yang couple ke authStore, biar logic inti
 * bisa dites terpisah tanpa perlu Zustand/Vite runtime/network sama
 * sekali. Ini juga alasan kenapa dipindah ke folder sendiri, bukan
 * digabung 1 file sama hasPermission() seperti draft awal.
 */
export function evaluatePermission(
  permissions: string[],
  isSuperAdmin: boolean,
  code: string | string[]
): boolean {
  if (isSuperAdmin) return true
  const codes = Array.isArray(code) ? code : [code]
  return codes.some((c) => permissions.includes(c))
}
