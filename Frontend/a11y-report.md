# Laporan A11y Sweep - MyJAP Employee Portal

Dibuat: 2026-09-08T22:39:05.372Z

Ruleset: WCAG 2.1 A + AA (axe-core, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`)

## Ringkasan per Halaman

| Halaman | Path | Status | Jumlah Violation |
|---|---|---|---|
| Login | `/login` | Discan | 0 |
| Dashboard - Awal Load | `/` | Discan | 0 |
| Dashboard - Date Picker Kehadiran (fokus) | `/` | Discan | 0 |
| Dashboard - Tren Kehadiran (30 hari) | `/` | Discan | 0 |
| Notifikasi - Dropdown Topbar (terbuka) | `/` | Discan | 0 |
| Notifikasi - Halaman Penuh (terisi) | `/notifications` | Discan | 0 |
| Notifikasi - Halaman Penuh (kosong) | `/notifications?page=2` | Discan | 0 |
| Notifikasi - Dialog Konfirmasi Hapus | `/notifications` | Discan | 0 |
| Karyawan - List | `/employees` | Discan | 0 |
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
| Departemen | `/departments` | Discan | 0 |
| Jabatan | `/positions` | Discan | 0 |
| Role - List | `/roles` | Discan | 0 |
| Role - Permission Matrix | `/roles/2/permissions` | Discan | 0 |
| Shift Kerja | `/work-shifts` | Discan | 0 |
| Lokasi Kantor - List | `/office-locations` | Discan | 0 |
| Lokasi Kantor - Modal Edit (Tab Info) | `/office-locations` | Discan | 0 |
| Lokasi Kantor - Modal Edit (Tab Supervisor) | `/office-locations` | Discan | 0 |
| Komponen Gaji | `/payroll/salary-components` | Discan | 0 |
| Monitoring Absensi - Rincian Harian (kosong) | `/attendance` | Discan | 0 |
| Monitoring Absensi - Ringkasan per Karyawan (kosong) | `/attendance` | Discan | 0 |
| Monitoring Absensi - Rincian Harian (terisi) | `/attendance` | Discan | 0 |
| Monitoring Absensi - Ringkasan per Karyawan (terisi) | `/attendance` | Discan | 0 |
| Monitoring Absensi - Dropdown Ekspor (terbuka) | `/attendance` | Discan | 0 |
| Cuti - Admin - List Kosong | `/leave` | Discan | 0 |
| Cuti - Admin - List Terisi | `/leave` | Discan | 0 |
| Cuti - Admin - Dialog Tolak (alasan wajib) | `/leave` | Discan | 0 |
| Slip Gaji - Admin - List Kosong | `/payroll/payslips` | Discan | 0 |
| Slip Gaji - Admin - List Terisi | `/payroll/payslips` | Discan | 0 |
| Slip Gaji - Admin - Detail Modal | `/payroll/payslips` | Discan | 0 |
| Audit Log - List | `/audit-log` | Discan | 13 |
| Audit Log - Detail Modal | `/audit-log` | Discan | 0 |
| Employee Home - State Awal | `/` | Discan | 0 |
| Employee Home - Form Absen Masuk (dropdown + radius) | `/` | Discan | 0 |
| Employee Home - Setelah Foto Diambil | `/` | Discan | 0 |
| Employee Home - Dialog Konfirmasi Absen Masuk | `/` | Discan | 0 |
| Employee Home - Form Absen Masuk (is_unrestricted) | `/` | Discan | 0 |
| Employee Home - State Error 422 (Ditolak) | `/` | Discan | 0 |
| Riwayat Absensi - State Kosong | `/attendance` | Discan | 0 |
| Riwayat Absensi - State Terisi (+ indikator luar radius) | `/attendance` | ERROR (Cannot read properties of undefined (reading 'id')) | 0 |
| Riwayat Absensi - Date Range Picker (fokus) | `/attendance` | Discan | 0 |
| Riwayat Absensi - Date Range Picker (terisi rentang custom) | `/attendance` | Discan | 0 |
| Cuti - Karyawan - Form Kosong + Kuota | `/leave` | Discan | 0 |
| Cuti - Karyawan - Riwayat Terisi | `/leave` | ERROR (browserContext.newPage: Target crashed 
 Please check out https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/error-handling.md) | 0 |
| Slip Gaji - Karyawan - State Kosong | `/payroll/payslips` | ERROR (page.goto: net::ERR_INSUFFICIENT_RESOURCES at http://127.0.0.1:5173/payroll/payslips
Call log:
[2m  - navigating to "http://127.0.0.1:5173/payroll/payslips", waiting until "load"[22m
) | 0 |
| Slip Gaji - Karyawan - State Terisi + Detail | `/payroll/payslips` | ERROR (Publish payslip seed gagal (kemungkinan ApprovalWorkflow REGULAR aktif + approve() bug - di luar scope Task 12): Periode payroll ini masih 'Draft' - harus melewati seluruh proses approval (Submitted -> Approved) dulu sebelum bisa dipublish.) | 0 |

**Total violation di seluruh halaman: 13**

## Dikelompokkan Berdasarkan Root Cause

Ditemukan 3 root cause unik. Untuk rule `color-contrast`, dikelompokkan berdasarkan pasangan warna foreground/background PERSIS (class Tailwind yang sama selalu hasilin pasangan warna yang sama, di halaman mana pun dia dipakai).

### 1. `color-contrast` - 7 kemunculan

- **Deskripsi**: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **Impact**: serious
- **Referensi**: https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=playwright
- **Foreground**: `#2a7851` | **Background**: `#e3e9e3` | **Contrast Ratio**: 4.36
- **Muncul di halaman**:
  - Audit Log - List (`/audit-log`)
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(2) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(4) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(6) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(12) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(13) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(18) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(19) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`

### 2. `color-contrast` - 4 kemunculan

- **Deskripsi**: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **Impact**: serious
- **Referensi**: https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=playwright
- **Foreground**: `#c53030` | **Background**: `#f2e2df` | **Contrast Ratio**: 4.35
- **Muncul di halaman**:
  - Audit Log - List (`/audit-log`)
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(1) > .text-left:nth-child(3) > .bg-status-rejected\/10.text-status-rejected.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(3) > .text-left:nth-child(3) > .bg-status-rejected\/10.text-status-rejected.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(5) > .text-left:nth-child(3) > .bg-status-rejected\/10.text-status-rejected.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(20) > .text-left:nth-child(3) > .bg-status-rejected\/10.text-status-rejected.px-2`

### 3. `color-contrast` - 2 kemunculan

- **Deskripsi**: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **Impact**: serious
- **Referensi**: https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=playwright
- **Foreground**: `#2563eb` | **Background**: `#e2e7f2` | **Contrast Ratio**: 4.17
- **Muncul di halaman**:
  - Audit Log - List (`/audit-log`)
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(10) > .text-left:nth-child(3) > .bg-status-submitted\/10.text-status-submitted.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(15) > .text-left:nth-child(3) > .bg-status-submitted\/10.text-status-submitted.px-2`
