# Laporan A11y Sweep - MyJAP Employee Portal

Dibuat: 2026-09-21T20:42:56.639Z

Ruleset: WCAG 2.1 A + AA (axe-core, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`)

## Ringkasan per Halaman

| Halaman | Path | Status | Jumlah Violation |
|---|---|---|---|
| Login | `/login` | Discan | 0 |
| 2FA - Setup Wajib (scan QR) | `/2fa/setup` | Discan | 0 |
| 2FA - Setup Wajib (kode salah) | `/2fa/setup` | Discan | 0 |
| 2FA - Setup Wajib (recovery codes tampil) | `/2fa/setup` | Discan | 0 |
| 2FA - Verifikasi Login (form kode) | `/2fa/verify` | Discan | 0 |
| 2FA - Verifikasi Login (kode salah) | `/2fa/verify` | Discan | 0 |
| 2FA - Verifikasi Login (form recovery code) | `/2fa/verify` | Discan | 0 |
| Keamanan Akun - 2FA Aktif | `/security` | Discan | 0 |
| Dashboard - Awal Load | `/` | Discan | 0 |
| Dashboard - Date Picker Kehadiran (fokus) | `/` | Discan | 0 |
| Dashboard - Tren Kehadiran (30 hari) | `/` | Discan | 0 |
| Notifikasi - Dropdown Topbar (terbuka) | `/` | ERROR (locator.waitFor: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for getByText('Pengajuan Cuti Disetujui') to be visible[22m
) | 0 |
| Notifikasi - Halaman Penuh (terisi) | `/notifications` | ERROR (locator.waitFor: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for getByText('Pengajuan Cuti Disetujui') to be visible[22m
) | 0 |
| Notifikasi - Halaman Penuh (kosong) | `/notifications?page=2` | Discan | 0 |
| Notifikasi - Dialog Konfirmasi Hapus | `/notifications` | Discan | 0 |
| Karyawan - List | `/employees` | Discan | 0 |
| Karyawan - Filter Cabang (fokus) | `/employees` | Discan | 0 |
| Karyawan - Filter Cabang (hasil terisi) | `/employees?office_location_id=3` | Discan | 0 |
| Karyawan - Filter Cabang (hasil kosong) | `/employees?office_location_id=4` | Discan | 0 |
| Karyawan - Form Tambah | `/employees/new` | Discan | 0 |
| Karyawan - Form Edit | `/employees/25/edit` | Discan | 0 |
| Karyawan - Arsip | `/employees/archive` | Discan | 0 |
| Karyawan - Arsip - Dialog Konfirmasi Pulihkan | `/employees/archive` | Discan | 0 |
| Detail Karyawan - Tab Info | `/employees/25` | Discan | 0 |
| Detail Karyawan - Tab Pengecualian (kosong) | `/employees/25` | Discan | 0 |
| Detail Karyawan - MultiSelect Cabang Check-In (terbuka) | `/employees/25` | Discan | 0 |
| Detail Karyawan - Tab Pengecualian - 2 Blok Arah (SPECIFIC_BRANCHES) | `/employees/25` | Discan | 0 |
| Detail Karyawan - Dialog Konfirmasi Submit | `/employees/25` | Discan | 0 |
| Detail Karyawan - Tab Pengecualian (terisi) | `/employees/25` | Discan | 0 |
| Detail Karyawan - Dialog Konfirmasi Hapus | `/employees/25` | Discan | 0 |
| Detail Karyawan - Wewenang Cabang (kosong) | `/employees/25` | Discan | 0 |
| Detail Karyawan - Dropdown Tambah Cabang (fokus) | `/employees/25` | Discan | 0 |
| Detail Karyawan - Wewenang Cabang - Dialog Konfirmasi Tambah | `/employees/25` | Discan | 0 |
| Detail Karyawan - Wewenang Cabang (terisi) | `/employees/25` | Discan | 0 |
| Detail Karyawan - Wewenang Cabang - Dialog Konfirmasi Hapus | `/employees/25` | Discan | 0 |
| Detail Karyawan - Komponen Gaji (kosong) | `/employees/25` | Discan | 0 |
| Detail Karyawan - Komponen Gaji - Dialog Tambah/Cabut Override | `/employees/25` | ERROR (locator.selectOption: Test timeout of 3300000ms exceeded.
Call log:
[2m  - waiting for locator('#add_override_component')[22m
[2m    - locator resolved to <select aria-invalid="false" id="add_override_component" class="w-full appearance-none rounded-sm border px-4 pr-9 text-sm font-body text-neutral-900 focus:outline-none focus:border-2 focus:border-primary-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-neutral-400 border-neutral-200 py-2">…</select>[22m
[2m  - attempting select option action[22m
[2m    2 × waiting for element to be visible and enabled[22m
[2m      - did not find some options[22m
[2m    - retrying select option action[22m
[2m    - waiting 20ms[22m
[2m    2 × waiting for element to be visible and enabled[22m
[2m      - did not find some options[22m
[2m    - retrying select option action[22m
[2m      - waiting 100ms[22m
[2m    5556 × waiting for element to be visible and enabled[22m
[2m         - did not find some options[22m
[2m       - retrying select option action[22m
[2m         - waiting 500ms[22m
) | 0 |
| Departemen | `/departments` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Jabatan | `/positions` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Role - List | `/roles` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Role - Permission Matrix | `/roles/:id/permissions` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Shift Kerja | `/work-shifts` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Lokasi Kantor - List | `/office-locations` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Lokasi Kantor - Modal Edit (Tab Info) | `/office-locations` | ERROR (locator.waitFor: Target page, context or browser has been closed) | 0 |
| Lokasi Kantor - Modal Edit (Tab Supervisor) | `/office-locations` | ERROR (locator.click: Target page, context or browser has been closed) | 0 |
| Komponen Gaji | `/payroll/salary-components` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Komponen Gaji - Modal Tambah (field Kategori) | `/payroll/salary-components` | ERROR (locator.click: Target page, context or browser has been closed) | 0 |
| Komponen Gaji - Modal Edit (Nominal per Jabatan) | `/payroll/salary-components` | ERROR (locator.click: Target page, context or browser has been closed) | 0 |
| Atur Tarif per Cabang - Kosong (belum pilih cabang) | `/payroll/salary-rates-by-branch` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Atur Tarif per Cabang - Loading | `/payroll/salary-rates-by-branch` | ERROR (page.route: Target page, context or browser has been closed) | 0 |
| Atur Tarif per Cabang - Terisi | `/payroll/salary-rates-by-branch` | ERROR (locator.waitFor: Target page, context or browser has been closed) | 0 |
| Monitoring Absensi - State Kosong (Rincian Harian & Ringkasan) | `/attendance` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Monitoring Absensi - State Terisi (Rincian Harian, Ringkasan, Dropdown Ekspor) | `/attendance` | ERROR (page.evaluate: Target page, context or browser has been closed) | 0 |
| Cuti - Admin - List Kosong | `/leave` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Cuti - Admin - List Terisi + Dialog Tolak | `/leave` | ERROR (page.evaluate: Target page, context or browser has been closed) | 0 |
| Periode Payroll - Admin - List Kosong | `/payroll/periods` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Periode Payroll - Admin - List Terisi + Detail + Dialog Submit | `/payroll/periods` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Mulai Periode Baru - Form Kosong | `/payroll/bulk-process` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Mulai Periode Baru - Kombinasi Sudah Ada | `/payroll/bulk-process` | ERROR (locator.selectOption: Target page, context or browser has been closed) | 0 |
| Mulai Periode Baru - Preview Cabang | `/payroll/bulk-process` | ERROR (locator.fill: Target page, context or browser has been closed) | 0 |
| Periode Payroll - Banner Generate Berhasil | `/payroll/periods` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Periode Payroll - Banner Generate Gagal Sebagian | `/payroll/periods` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Slip Gaji - Admin - List Kosong | `/payroll/payslips` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Slip Gaji - Admin - List Terisi + Detail | `/payroll/payslips` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Alur Approval - Admin - List Kosong | `/payroll/approval-workflow` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Alur Approval - Admin - List Terisi | `/payroll/approval-workflow` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Alur Approval - Admin - Dialog Tambah (kosong) | `/payroll/approval-workflow` | ERROR (locator.click: Target page, context or browser has been closed) | 0 |
| Alur Approval - Admin - Dialog Tambah (terisi) + Edit + Validasi + Hapus | `/payroll/approval-workflow` | ERROR (page.evaluate: Target page, context or browser has been closed) | 0 |
| Audit Log - List | `/audit-log` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Audit Log - Detail Modal | `/audit-log` | ERROR (locator.waitFor: Target page, context or browser has been closed) | 0 |
| Employee Home - Bersihkan absensi hari ini (persiapan) | `/` | ERROR (page.evaluate: Target page, context or browser has been closed) | 0 |
| Employee Home - State Awal | `/` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Employee Home - Form Absen Masuk (dropdown + radius) | `/` | ERROR (browserContext.grantPermissions: Target page, context or browser has been closed) | 0 |
| Employee Home - Setelah Foto Diambil | `/` | ERROR (locator.click: Target page, context or browser has been closed) | 0 |
| Employee Home - Dialog Konfirmasi Absen Masuk | `/` | ERROR (locator.click: Target page, context or browser has been closed) | 0 |
| Employee Home - Form Absen Masuk (is_unrestricted) | `/` | ERROR (apiRequestContext.put: Test timeout of 3300000ms exceeded.) | 0 |
| Employee Home - State Error 422 (Ditolak) | `/` | ERROR (apiRequestContext.delete: Test timeout of 3300000ms exceeded.) | 0 |
| Riwayat Absensi - Bersihkan riwayat 90 hari (persiapan) | `/attendance` | ERROR (apiRequestContext.get: Test timeout of 3300000ms exceeded.) | 0 |
| Riwayat Absensi - State Kosong | `/attendance` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Riwayat Absensi - State Terisi (+ indikator luar radius) | `/attendance` | ERROR (apiRequestContext.put: Test timeout of 3300000ms exceeded.) | 0 |
| Riwayat Absensi - Date Range Picker (fokus) | `/attendance` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Riwayat Absensi - Date Range Picker (terisi rentang custom) | `/attendance` | ERROR (locator.fill: Target page, context or browser has been closed) | 0 |
| Cuti - Karyawan - Form Kosong + Kuota | `/leave` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Cuti - Karyawan - Riwayat Terisi | `/leave` | ERROR (apiRequestContext.post: Test timeout of 3300000ms exceeded.) | 0 |
| Slip Gaji - Karyawan - State Kosong | `/payroll/payslips` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Slip Gaji - Karyawan - State Terisi + Detail | `/payroll/payslips` | ERROR (apiRequestContext.post: Test timeout of 3300000ms exceeded.) | 0 |
| Sidebar - Kategori Expand Manual (chevron terbuka) | `/` | ERROR (page.goto: Target page, context or browser has been closed) | 0 |
| Sidebar - Drawer Mobile + Accordion | `/` | ERROR (page.setViewportSize: Target page, context or browser has been closed) | 0 |

**Total violation di seluruh halaman: 0**

## Dikelompokkan Berdasarkan Root Cause

Ditemukan 0 root cause unik. Untuk rule `color-contrast`, dikelompokkan berdasarkan pasangan warna foreground/background PERSIS (class Tailwind yang sama selalu hasilin pasangan warna yang sama, di halaman mana pun dia dipakai).
