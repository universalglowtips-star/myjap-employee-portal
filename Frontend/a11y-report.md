# Laporan A11y Sweep - MyJAP Employee Portal

Dibuat: 2026-08-26T02:41:31.069Z

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
| Departemen | `/departments` | Discan | 0 |
| Jabatan | `/positions` | Discan | 0 |
| Role - List | `/roles` | Discan | 0 |
| Role - Permission Matrix | `/roles/2/permissions` | Discan | 0 |
| Shift Kerja | `/work-shifts` | Discan | 0 |
| Lokasi Kantor - List | `/office-locations` | Discan | 0 |
| Lokasi Kantor - Modal Edit (Tab Info) | `/office-locations` | Discan | 0 |
| Lokasi Kantor - Modal Edit (Tab Supervisor) | `/office-locations` | Discan | 0 |
| Komponen Gaji | `/payroll/salary-components` | Discan | 0 |
| Audit Log - List | `/audit-log` | Discan | 14 |
| Audit Log - Detail Modal | `/audit-log` | Discan | 0 |

**Total violation di seluruh halaman: 14**

## Dikelompokkan Berdasarkan Root Cause

Ditemukan 3 root cause unik. Untuk rule `color-contrast`, dikelompokkan berdasarkan pasangan warna foreground/background PERSIS (class Tailwind yang sama selalu hasilin pasangan warna yang sama, di halaman mana pun dia dipakai).

### 1. `color-contrast` - 7 kemunculan

- **Deskripsi**: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **Impact**: serious
- **Referensi**: https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=playwright
- **Foreground**: `#2a7851` | **Background**: `#e3e9e3` | **Contrast Ratio**: 4.36
- **Muncul di halaman**:
  - Audit Log - List (`/audit-log`)
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(9) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(10) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(12) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(15) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(18) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(19) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(20) > .text-left:nth-child(3) > .bg-status-approved\/10.text-status-approved.px-2`

### 2. `color-contrast` - 6 kemunculan

- **Deskripsi**: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **Impact**: serious
- **Referensi**: https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=playwright
- **Foreground**: `#2563eb` | **Background**: `#e2e7f2` | **Contrast Ratio**: 4.17
- **Muncul di halaman**:
  - Audit Log - List (`/audit-log`)
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(5) > .text-left:nth-child(3) > .bg-status-submitted\/10.text-status-submitted.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(6) > .text-left:nth-child(3) > .bg-status-submitted\/10.text-status-submitted.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(8) > .text-left:nth-child(3) > .bg-status-submitted\/10.text-status-submitted.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(11) > .text-left:nth-child(3) > .bg-status-submitted\/10.text-status-submitted.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(13) > .text-left:nth-child(3) > .bg-status-submitted\/10.text-status-submitted.px-2`
    - `.cursor-pointer.focus\:bg-neutral-50:nth-child(14) > .text-left:nth-child(3) > .bg-status-submitted\/10.text-status-submitted.px-2`

### 3. `color-contrast` - 1 kemunculan

- **Deskripsi**: Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds
- **Impact**: serious
- **Referensi**: https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=playwright
- **Foreground**: `#c53030` | **Background**: `#f2e2df` | **Contrast Ratio**: 4.35
- **Muncul di halaman**:
  - Audit Log - List (`/audit-log`)
    - `.bg-status-rejected\/10`
