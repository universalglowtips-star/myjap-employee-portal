import { defineConfig } from '@playwright/test'

/**
 * Config Playwright PERTAMA di project ini (belum ada infrastruktur
 * test sebelumnya) - dibuat khusus buat kebutuhan a11y sweep, tapi
 * ditulis generik (testDir './tests') biar bisa dipakai ulang buat
 * spec Playwright lain nanti, bukan cuma satu file ini doang.
 *
 * `webServer` array (BUKAN cuma 1 server) - sweep butuh backend
 * (php artisan serve, :8000) DAN frontend (vite, :5173) jalan
 * bareng. `reuseExistingServer: true` (bukan cuma !CI) - kalau dev
 * server udah kebuka manual duluan (workflow umum sesi development
 * ini), Playwright pakai itu, gak nyoba buka baru dan bentrok port.
 *
 * fullyParallel: false + workers: 1 - sweep ini SEKUENSIAL by design
 * (1 browser context, login sekali di awal, state auth dipakai
 * bareng buat semua halaman berikutnya) - paralel bakal butuh
 * login ulang per-worker, gak sesuai desain skrip ini.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      // --host 127.0.0.1 WAJIB - defaultnya Vite bind ke 'localhost' yang di
      // mesin ini resolve duluan ke IPv6 (::1), sedangkan health-check
      // Playwright nembak 127.0.0.1 (IPv4) -> ECONNREFUSED terus meski Vite
      // udah "ready". Dikonfirmasi dari netstat: listener asli ada di [::1]:5173.
      command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'php artisan serve',
      // `port` (BUKAN `url`) - Playwright nganggep `url` ready cuma kalau
      // respons HTTP-nya 2xx/3xx. Semua route /api/* di backend ini POST-only
      // (balikin 405 buat GET), jadi gak ada endpoint GET yang bisa dipakai
      // buat health-check berbasis `url`. `port` cuma cek socket-nya nyala
      // (TCP connect sukses), itu udah cukup buat mastiin server siap.
      port: 8000,
      reuseExistingServer: true,
      timeout: 60_000,
      cwd: '..',
    },
  ],
})
