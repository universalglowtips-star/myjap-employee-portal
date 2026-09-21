# Laporan A11y Sweep - MyJAP Employee Portal

Dibuat: 2026-09-20T21:58:22.992Z

Ruleset: WCAG 2.1 A + AA (axe-core, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`)

## Ringkasan per Halaman

| Halaman | Path | Status | Jumlah Violation |
|---|---|---|---|
| Login | `/login` | Discan | 0 |
| Dashboard - Awal Load | `/` | Discan | 0 |
| Dashboard - Date Picker Kehadiran (fokus) | `/` | Discan | 0 |
| Dashboard - Tren Kehadiran (30 hari) | `/` | Discan | 0 |
| Notifikasi - Dropdown Topbar (terbuka) | `/` | ERROR (locator.waitFor: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for getByText('Pengajuan Cuti Disetujui') to be visible[22m
) | 0 |
| Notifikasi - Halaman Penuh (terisi) | `/notifications` | Discan | 0 |
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
| Detail Karyawan - Komponen Gaji (kosong) | `/employees/25` | ERROR (locator.waitFor: Timeout 30000ms exceeded.
Call log:
[2m  - waiting for getByText('—').first() to be visible[22m
) | 0 |
| Detail Karyawan - Komponen Gaji - Dialog Konfirmasi Tambah Override | `/employees/25` | Discan | 0 |
| Detail Karyawan - Komponen Gaji - Dialog Tambah/Cabut Override | `/employees/25` | ERROR (locator.waitFor: Timeout 10000ms exceeded.
Call log:
[2m  - waiting for getByRole('alertdialog') to be hidden[22m
[2m    19 × locator resolved to visible <div tabindex="-1" aria-modal="true" role="alertdialog" aria-labelledby="modal-title-_r_j_" class="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-lg focus:outline-none">…</div>[22m
) | 0 |
| Departemen | `/departments` | Discan | 0 |
| Jabatan | `/positions` | Discan | 0 |
| Role - List | `/roles` | Discan | 0 |
| Role - Permission Matrix | `/roles/2/permissions` | Discan | 0 |
| Shift Kerja | `/work-shifts` | Discan | 0 |
| Lokasi Kantor - List | `/office-locations` | Discan | 0 |
| Lokasi Kantor - Modal Edit (Tab Info) | `/office-locations` | Discan | 0 |
| Lokasi Kantor - Modal Edit (Tab Supervisor) | `/office-locations` | Discan | 0 |
| Komponen Gaji | `/payroll/salary-components` | Discan | 0 |
| Komponen Gaji - Modal Tambah (Kategori situational) | `/payroll/salary-components` | Discan | 0 |
| Komponen Gaji - Modal Edit (Nominal per Jabatan kosong) | `/payroll/salary-components` | Discan | 0 |
| Komponen Gaji - Dialog Konfirmasi Tambah Nominal Jabatan | `/payroll/salary-components` | Discan | 0 |
| Komponen Gaji - Modal Edit (Nominal per Jabatan) | `/payroll/salary-components` | ERROR (locator.waitFor: Error: strict mode violation: getByText(/Rp\s*100\.000/) resolved to 2 elements:
    1) <td class="px-3 py-2 text-sm text-neutral-900 font-mono text-right">Rp 100.000</td> aka getByRole('cell', { name: 'Rp 100.000' })
    2) <span class="font-mono">Rp 100.000</span> aka getByLabel('Edit Komponen Gaji').getByText('Rp 100.000')

Call log:
[2m  - waiting for getByText(/Rp\s*100\.000/) to be visible[22m
) | 0 |
| Atur Tarif per Cabang - Kosong (belum pilih cabang) | `/payroll/salary-rates-by-branch` | Discan | 0 |
| Atur Tarif per Cabang - Loading | `/payroll/salary-rates-by-branch` | Discan | 0 |
| Atur Tarif per Cabang - Terisi | `/payroll/salary-rates-by-branch` | Discan | 0 |
| Monitoring Absensi - Rincian Harian (kosong) | `/attendance` | Discan | 0 |
| Monitoring Absensi - Ringkasan per Karyawan (kosong) | `/attendance` | Discan | 0 |
| Monitoring Absensi - State Terisi (Rincian Harian, Ringkasan, Dropdown Ekspor) | `/attendance` | ERROR (locator.waitFor: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for locator('table').getByText('QA Employee Test').first() to be visible[22m
) | 0 |
| Cuti - Admin - List Kosong | `/leave` | Discan | 0 |
| Cuti - Admin - List Terisi | `/leave` | Discan | 0 |
| Cuti - Admin - Dialog Tolak (alasan wajib) | `/leave` | Discan | 0 |
| Periode Payroll - Admin - List Kosong | `/payroll/periods` | Discan | 0 |
| Periode Payroll - Admin - List Terisi | `/payroll/periods` | Discan | 0 |
| Periode Payroll - Admin - Detail (Draft) | `/payroll/periods/:id` | Discan | 0 |
| Periode Payroll - Admin - List Terisi + Detail + Dialog Submit | `/payroll/periods` | ERROR (locator.waitFor: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for getByText('Isi Data Periode') to be visible[22m
) | 0 |
| Mulai Periode Baru - Form Kosong | `/payroll/bulk-process` | Discan | 0 |
| Mulai Periode Baru - Kombinasi Sudah Ada | `/payroll/bulk-process` | Discan | 0 |
| Mulai Periode Baru - Preview Cabang | `/payroll/bulk-process` | Discan | 0 |
| Periode Payroll - Banner Generate Berhasil | `/payroll/periods` | Discan | 0 |
| Periode Payroll - Banner Generate Gagal Sebagian | `/payroll/periods` | Discan | 0 |
| Slip Gaji - Admin - List Kosong | `/payroll/payslips` | Discan | 0 |
| Slip Gaji - Admin - List Terisi | `/payroll/payslips` | Discan | 0 |
| Slip Gaji - Admin - Detail Modal | `/payroll/payslips` | Discan | 0 |
| Alur Approval - Admin - List Kosong | `/payroll/approval-workflow` | Discan | 0 |
| Alur Approval - Admin - List Terisi | `/payroll/approval-workflow` | Discan | 0 |
| Alur Approval - Admin - Dialog Tambah (kosong) | `/payroll/approval-workflow` | Discan | 0 |
| Alur Approval - Admin - Dialog Tambah (terisi) | `/payroll/approval-workflow` | Discan | 0 |
| Alur Approval - Admin - Dialog Edit | `/payroll/approval-workflow` | Discan | 0 |
| Alur Approval - Admin - Validasi Error | `/payroll/approval-workflow` | Discan | 0 |
| Alur Approval - Admin - Dialog Konfirmasi Hapus | `/payroll/approval-workflow` | Discan | 0 |
| Audit Log - List | `/audit-log` | Discan | 11 |
| Audit Log - Detail Modal | `/audit-log` | Discan | 0 |
| Employee Home - State Awal | `/` | ERROR (locator.waitFor: Timeout 10000ms exceeded.
Call log:
[2m  - waiting for getByRole('button', { name: 'Absen Masuk' }) to be visible[22m
) | 0 |
| Employee Home - Form Absen Masuk (dropdown + radius) | `/` | ERROR (locator.waitFor: Timeout 15000ms exceeded.
Call log:
[2m  - waiting for locator('#attendance-office') to be visible[22m
) | 0 |
| Employee Home - Setelah Foto Diambil | `/` | Discan | 0 |
| Employee Home - Dialog Konfirmasi Absen Masuk | `/` | Discan | 0 |
| Employee Home - Form Absen Masuk (is_unrestricted) | `/` | Discan | 0 |
| Employee Home - State Error 422 (Ditolak) | `/` | Discan | 0 |
| Riwayat Absensi - State Kosong | `/attendance` | Discan | 0 |
| Riwayat Absensi - State Terisi (+ indikator luar radius) | `/attendance` | ERROR (Cannot read properties of undefined (reading 'id')) | 0 |
| Riwayat Absensi - Date Range Picker (fokus) | `/attendance` | Discan | 0 |
| Riwayat Absensi - Date Range Picker (terisi rentang custom) | `/attendance` | Discan | 0 |
| Cuti - Karyawan - Form Kosong + Kuota | `/leave` | Discan | 0 |
| Cuti - Karyawan - Riwayat Terisi | `/leave` | Discan | 0 |
| Slip Gaji - Karyawan - State Kosong | `/payroll/payslips` | Discan | 0 |
| Slip Gaji - Karyawan - State Terisi + Detail | `/payroll/payslips` | ERROR (Cannot read properties of undefined (reading 'id')) | 0 |
| Sidebar - Kategori Expand Manual (chevron terbuka) | `/` | ERROR (locator.waitFor: Timeout 10000ms exceeded.
Call log:
[2m  - waiting for getByRole('link', { name: 'Periode Payroll' }) to be visible[22m
) | 0 |
| Sidebar - Drawer Mobile (kategori aktif expand) | `/` | Discan | 0 |
| Sidebar - Drawer Mobile (kategori manual expand) | `/` | Discan | 0 |

**Total violation di seluruh halaman: 11**

## Dikelompokkan Berdasarkan Root Cause

Ditemukan 2 root cause unik. Untuk rule `color-contrast`, dikelompokkan berdasarkan pasangan warna foreground/background PERSIS (class Tailwind yang sama selalu hasilin pasangan warna yang sama, di halaman mana pun dia dipakai).

### 1. `color-contrast` - 6 kemunculan

- **Deskripsi**: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **Impact**: serious
- **Referensi**: https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=playwright
- **Foreground**: `#2a7851` | **Background**: `#e3e9e3` | **Contrast Ratio**: 4.36
- **Muncul di halaman**:
  - Audit Log - List (`/audit-log`)
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(2) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(4) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(5) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(6) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(8) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(15) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`

### 2. `color-contrast` - 5 kemunculan

- **Deskripsi**: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **Impact**: serious
- **Referensi**: https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=playwright
- **Foreground**: `#c53030` | **Background**: `#f2e2df` | **Contrast Ratio**: 4.35
- **Muncul di halaman**:
  - Audit Log - List (`/audit-log`)
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(1) > .text-left:nth-child(3) > .bg-status-rejected\/10.text-status-rejected.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(3) > .text-left:nth-child(3) > .bg-status-rejected\/10.text-status-rejected.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(7) > .text-left:nth-child(3) > .bg-status-rejected\/10.text-status-rejected.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(14) > .text-left:nth-child(3) > .bg-status-rejected\/10.text-status-rejected.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(20) > .text-left:nth-child(3) > .bg-status-rejected\/10.text-status-rejected.px-2`
