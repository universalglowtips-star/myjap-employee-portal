# Laporan A11y Sweep - MyJAP Employee Portal

Dibuat: 2026-08-26T05:53:59.963Z

Ruleset: WCAG 2.1 A + AA (axe-core, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`)

## Ringkasan per Halaman

| Halaman | Path | Status | Jumlah Violation |
|---|---|---|---|
| Login | `/login` | Discan | 0 |
| Dashboard | `/` | Di-skip (Halaman masih placeholder (DashboardPlaceholder di App.tsx) - belum diimplementasi, di-skip.) | 0 |
| Karyawan - List | `/employees` | Discan | 0 |
| Karyawan - Form Tambah | `/employees/new` | Discan | 0 |
| Karyawan - Form Edit | `/employees/25/edit` | Discan | 0 |
| Karyawan - Arsip | `/employees/archive` | Discan | 0 |
| Detail Karyawan - Tab Info | `/employees/25` | Discan | 0 |
| Detail Karyawan - Tab Pengecualian (kosong) | `/employees/25` | Discan | 0 |
| Detail Karyawan - Dialog Konfirmasi Submit | `/employees/25` | Discan | 0 |
| Detail Karyawan - Tab Pengecualian (terisi) | `/employees/25` | Discan | 0 |
| Detail Karyawan - MultiSelect Cabang (terbuka) | `/employees/25` | Discan | 0 |
| Detail Karyawan - Dialog Konfirmasi Hapus | `/employees/25` | Discan | 0 |
| Departemen | `/departments` | Discan | 0 |
| Jabatan | `/positions` | Discan | 0 |
| Role - List | `/roles` | Discan | 0 |
| Role - Permission Matrix | `/roles/2/permissions` | Discan | 0 |
| Shift Kerja | `/work-shifts` | Discan | 0 |
| Lokasi Kantor - List | `/office-locations` | Discan | 0 |
| Lokasi Kantor - Modal Edit (Tab Info) | `/office-locations` | Discan | 0 |
| Lokasi Kantor - Modal Edit (Tab Supervisor) | `/office-locations` | Discan | 0 |
| Komponen Gaji | `/payroll/salary-components` | Discan | 0 |
| Audit Log - List | `/audit-log` | Discan | 0 |
| Audit Log - Detail Modal | `/audit-log` | Discan | 0 |

**Total violation di seluruh halaman: 0**

## Dikelompokkan Berdasarkan Root Cause

Ditemukan 0 root cause unik. Untuk rule `color-contrast`, dikelompokkan berdasarkan pasangan warna foreground/background PERSIS (class Tailwind yang sama selalu hasilin pasangan warna yang sama, di halaman mana pun dia dipakai).
