import { test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Sweep a11y otomatis SELURUH halaman yang sudah dibangun - baseline
 * lengkap, BUKAN alat fix. Skrip ini cuma NGUMPULIN pelanggaran axe-core
 * (WCAG 2.1 A/AA), gak nyentuh kode aplikasi sama sekali.
 *
 * Login pakai akun QA persisten (id=25, role SUPER_ADMIN) - BUKAN akun
 * asli Ahmad Bagus, karena password asli Bagus gak pernah diketahui/
 * ke-expose ke sesi ini (cuma hash di DB). Akun ini sengaja PERSISTEN
 * (bukan dibuat-lalu-dihapus tiap run) supaya skrip reusable tanpa
 * setup ulang tiap kali dijalankan.
 *
 * Tiap halaman dibungkus try/catch sendiri-sendiri (lihat safeStep) -
 * kalau satu halaman gagal (selector berubah, elemen ga ketemu, dll),
 * SISA halaman tetap discan. Tujuannya baseline LENGKAP, satu halaman
 * error gak boleh gugurin seluruh laporan.
 */

const QA_EMAIL = 'qa-a11y-sweep@myjap.com'
const QA_PASSWORD = 'A11ySweepTest123!'
/** Employee id=25 = akun QA a11y sweep sendiri (dibuat khusus tugas ini, dijamin selalu ada). */
const EMPLOYEE_EDIT_ID = 25

const REPORT_JSON_PATH = path.resolve(__dirname, '..', 'a11y-report.json')
const REPORT_MD_PATH = path.resolve(__dirname, '..', 'a11y-report.md')

interface ViolationRecord {
  ruleId: string
  impact: string | null
  description: string
  helpUrl: string
  selector: string
  html: string
  fgColor?: string
  bgColor?: string
  contrastRatio?: string
  fontSize?: string
  fontWeight?: string
}

interface PageResult {
  label: string
  path: string
  status: 'scanned' | 'skipped' | 'error'
  note?: string
  violations: ViolationRecord[]
}

const allResults: PageResult[] = []

async function runAxe(page: Page, label: string, pathname: string, scopeSelector?: string): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  if (scopeSelector) {
    builder = builder.include(scopeSelector)
  }
  const results = await builder.analyze()

  const violations: ViolationRecord[] = []
  for (const v of results.violations) {
    for (const node of v.nodes) {
      const contrastCheck = node.any.find((c) => c.id === 'color-contrast')
      const data = contrastCheck?.data as
        | { fgColor?: string; bgColor?: string; contrastRatio?: string; fontSize?: string; fontWeight?: string }
        | undefined
      violations.push({
        ruleId: v.id,
        impact: v.impact ?? null,
        description: v.description,
        helpUrl: v.helpUrl,
        selector: node.target.join(' '),
        html: node.html,
        fgColor: data?.fgColor,
        bgColor: data?.bgColor,
        contrastRatio: data?.contrastRatio,
        fontSize: data?.fontSize,
        fontWeight: data?.fontWeight,
      })
    }
  }

  allResults.push({ label, path: pathname, status: 'scanned', violations })
  console.log(`  [scan] ${label} (${pathname}) -> ${violations.length} violation(s)`)
}

function skipPage(label: string, pathname: string, reason: string): void {
  allResults.push({ label, path: pathname, status: 'skipped', note: reason, violations: [] })
  console.log(`  [skip] ${label} (${pathname}) -> ${reason}`)
}

function recordError(label: string, pathname: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  allResults.push({ label, path: pathname, status: 'error', note: message, violations: [] })
  console.log(`  [error] ${label} (${pathname}) -> ${message}`)
}

/** Bungkus tiap langkah halaman - kegagalan satu halaman TIDAK BOLEH gugurin sisa sweep. */
async function safeStep(label: string, pathname: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
  } catch (err) {
    recordError(label, pathname, err)
  }
}

async function gotoAndSettle(page: Page, pathname: string): Promise<void> {
  await page.goto(pathname)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(400)
}

test.describe.serial('a11y sweep - seluruh halaman', () => {
  test('scan semua halaman yang sudah dibangun', async ({ page }) => {
    test.setTimeout(300_000)

    // === /login (SEBELUM login - context browser baru, otomatis logged-out) ===
    await safeStep('Login', '/login', async () => {
      await page.goto('/login')
      await page.locator('#email').waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Login', '/login')
    })

    // === Proses login pakai akun QA persisten ===
    await safeStep('Login (proses submit)', '/login', async () => {
      await page.locator('#email').fill(QA_EMAIL)
      await page.locator('#password').fill(QA_PASSWORD)
      await page.getByRole('button', { name: 'Masuk' }).click()
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
    })

    // === / (Dashboard) - masih placeholder, SKIP sesuai instruksi ===
    skipPage('Dashboard', '/', 'Halaman masih placeholder (DashboardPlaceholder di App.tsx) - belum diimplementasi, di-skip.')

    // === /employees ===
    await safeStep('Karyawan - List', '/employees', async () => {
      await gotoAndSettle(page, '/employees')
      await runAxe(page, 'Karyawan - List', '/employees')
    })

    // === /employees/new ===
    await safeStep('Karyawan - Form Tambah', '/employees/new', async () => {
      await gotoAndSettle(page, '/employees/new')
      await runAxe(page, 'Karyawan - Form Tambah', '/employees/new')
    })

    // === /employees/{id}/edit ===
    await safeStep('Karyawan - Form Edit', `/employees/${EMPLOYEE_EDIT_ID}/edit`, async () => {
      await gotoAndSettle(page, `/employees/${EMPLOYEE_EDIT_ID}/edit`)
      await runAxe(page, 'Karyawan - Form Edit', `/employees/${EMPLOYEE_EDIT_ID}/edit`)
    })

    // === /employees/archive ===
    await safeStep('Karyawan - Arsip', '/employees/archive', async () => {
      await gotoAndSettle(page, '/employees/archive')
      await runAxe(page, 'Karyawan - Arsip', '/employees/archive')
    })

    // === /departments ===
    await safeStep('Departemen', '/departments', async () => {
      await gotoAndSettle(page, '/departments')
      await runAxe(page, 'Departemen', '/departments')
    })

    // === /positions ===
    await safeStep('Jabatan', '/positions', async () => {
      await gotoAndSettle(page, '/positions')
      await runAxe(page, 'Jabatan', '/positions')
    })

    // === /roles ===
    await safeStep('Role - List', '/roles', async () => {
      await gotoAndSettle(page, '/roles')
      await runAxe(page, 'Role - List', '/roles')
    })

    // === /roles/{id}/permissions (Permission Matrix) - judgment call: scan
    // role NON-SUPER_ADMIN kalau ketemu, biar dapet state checkbox yang
    // interaktif/editable, bukan cuma baris SUPER_ADMIN yang all-checked-disabled ===
    await safeStep('Role - Permission Matrix', '/roles/:id/permissions', async () => {
      await gotoAndSettle(page, '/roles')
      // Tombol "Lihat matrix permission {role_name}" - onClick navigate(),
      // BUKAN <a href> (dikonfirmasi dari RoleListPage.tsx), jadi cari
      // via aria-label, bukan atribut href.
      const matrixButtons = page.locator('button[aria-label^="Lihat matrix permission"]')
      const count = await matrixButtons.count()
      if (count === 0) {
        throw new Error('Tidak ada tombol menuju halaman permission matrix di /roles')
      }
      let target = matrixButtons.first()
      for (let i = 0; i < count; i++) {
        const label = await matrixButtons.nth(i).getAttribute('aria-label').catch(() => '')
        if (label && !label.includes('Super Admin')) {
          target = matrixButtons.nth(i)
          break
        }
      }
      await target.click()
      await page.waitForURL(/\/roles\/\d+\/permissions/, { timeout: 15000 })
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(400)
      const url = new URL(page.url())
      await runAxe(page, 'Role - Permission Matrix', url.pathname)
    })

    // === /work-shifts ===
    await safeStep('Shift Kerja', '/work-shifts', async () => {
      await gotoAndSettle(page, '/work-shifts')
      await runAxe(page, 'Shift Kerja', '/work-shifts')
    })

    // === /office-locations (List + Modal Edit Tab Info + Tab Supervisor) ===
    await safeStep('Lokasi Kantor - List', '/office-locations', async () => {
      await gotoAndSettle(page, '/office-locations')
      await runAxe(page, 'Lokasi Kantor - List', '/office-locations')
    })

    await safeStep('Lokasi Kantor - Modal Edit (Tab Info)', '/office-locations', async () => {
      const editButton = page.locator('button[aria-label^="Edit "]').first()
      await editButton.waitFor({ state: 'visible', timeout: 15000 })
      await editButton.click()
      const dialog = page.locator('[role="dialog"]')
      await dialog.waitFor({ state: 'visible', timeout: 15000 })
      await page.waitForTimeout(300)
      await runAxe(page, 'Lokasi Kantor - Modal Edit (Tab Info)', '/office-locations', '[role="dialog"]')
    })

    await safeStep('Lokasi Kantor - Modal Edit (Tab Supervisor)', '/office-locations', async () => {
      const dialog = page.locator('[role="dialog"]')
      await dialog.getByText('Supervisor', { exact: true }).click()
      // Klik tab men-trigger fetch async (useOfficeLocationSupervisors +
      // daftar karyawan) - waitForTimeout tetap TIDAK CUKUP di sini
      // (race condition nyata: axe pernah kescan pas UI masih nampilin
      // "Memuat data supervisor..." - warna beda, LOLOS kontras - bukan
      // daftar kandidat asli yang punya span email text-neutral-400 yang
      // GAGAL kontras. Ini persis kenapa violation email kelewatan di
      // baseline sweep sebelumnya). Tunggu render nyata: minimal 1 baris
      // kandidat (<label>) ATAU pesan "Belum ada karyawan" - salah satu
      // PASTI muncul begitu data beneran selesai di-load, race keduanya
      // biar gak hang kalau daftar kandidatnya kosong.
      //
      // `label:visible` (BUKAN `label` polos) - tab "Info Lokasi" TETAP di
      // DOM waktu tab "Supervisor" aktif (cuma disembunyikan via class
      // 'hidden', bukan unmount), dan tab Info itu sendiri punya banyak
      // <label> form (mis. "Kode Lokasi"). `label` polos bakal nangkep
      // label form itu duluan (element pertama di DOM) yang PERMANEN
      // hidden selama tab Supervisor aktif -> waitFor 'visible' timeout
      // selamanya walau kandidat supervisor beneran udah kerender.
      await Promise.race([
        dialog.locator('label:visible').first().waitFor({ state: 'visible', timeout: 15000 }),
        dialog.getByText('Belum ada karyawan.').waitFor({ state: 'visible', timeout: 15000 }),
      ])
      await page.waitForTimeout(300)
      await runAxe(page, 'Lokasi Kantor - Modal Edit (Tab Supervisor)', '/office-locations', '[role="dialog"]')
      // Tutup modal - state bersih buat halaman berikutnya.
      await page.getByRole('button', { name: 'Batal' }).click()
    })

    // === /payroll/salary-components ===
    await safeStep('Komponen Gaji', '/payroll/salary-components', async () => {
      await gotoAndSettle(page, '/payroll/salary-components')
      await runAxe(page, 'Komponen Gaji', '/payroll/salary-components')
    })

    // === /audit-log (List + Detail Modal) ===
    await safeStep('Audit Log - List', '/audit-log', async () => {
      await gotoAndSettle(page, '/audit-log')
      await runAxe(page, 'Audit Log - List', '/audit-log')
    })

    await safeStep('Audit Log - Detail Modal', '/audit-log', async () => {
      const firstRow = page.locator('table tbody tr').first()
      await firstRow.waitFor({ state: 'visible', timeout: 15000 })
      await firstRow.click()
      const dialog = page.locator('[role="dialog"]')
      await dialog.waitFor({ state: 'visible', timeout: 15000 })
      await page.waitForTimeout(300)
      await runAxe(page, 'Audit Log - Detail Modal', '/audit-log', '[role="dialog"]')
    })

    writeReports()
    printSummary()
  })
})

// ---- Pelaporan ----

interface GroupedViolation {
  signature: string
  ruleId: string
  description: string
  impact: string | null
  helpUrl: string
  fgColor?: string
  bgColor?: string
  contrastRatio?: string
  occurrenceCount: number
  occurrences: { label: string; path: string; selector: string; html: string }[]
}

/**
 * Grouping by ROOT CAUSE (bukan flat list): buat rule 'color-contrast',
 * signature = ruleId + pasangan warna fg/bg persis - karena pelanggaran
 * kontras yang disebabkan CLASS TAILWIND YANG SAMA (mis. text-neutral-400
 * di atas bg putih) bakal selalu hasilin pasangan warna yang identik di
 * mana pun class itu dipakai, jadi otomatis ngumpul jadi 1 root cause
 * meski muncul di banyak halaman berbeda. Buat rule lain, signature =
 * ruleId polos (deskripsi masalahnya sama persis per rule).
 */
function buildGroups(results: PageResult[]): GroupedViolation[] {
  const map = new Map<string, GroupedViolation>()
  for (const r of results) {
    for (const v of r.violations) {
      const signature = v.ruleId === 'color-contrast' ? `color-contrast|${v.fgColor}|${v.bgColor}` : v.ruleId
      let g = map.get(signature)
      if (!g) {
        g = {
          signature,
          ruleId: v.ruleId,
          description: v.description,
          impact: v.impact,
          helpUrl: v.helpUrl,
          fgColor: v.fgColor,
          bgColor: v.bgColor,
          contrastRatio: v.contrastRatio,
          occurrenceCount: 0,
          occurrences: [],
        }
        map.set(signature, g)
      }
      g.occurrenceCount += 1
      g.occurrences.push({ label: r.label, path: r.path, selector: v.selector, html: v.html })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.occurrenceCount - a.occurrenceCount)
}

function writeReports(): void {
  const groups = buildGroups(allResults)
  const totalViolations = allResults.reduce((sum, r) => sum + r.violations.length, 0)

  fs.writeFileSync(
    REPORT_JSON_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalViolations,
        pages: allResults,
        groupedByRootCause: groups,
      },
      null,
      2,
    ),
    'utf-8',
  )

  const lines: string[] = []
  lines.push('# Laporan A11y Sweep - MyJAP Employee Portal')
  lines.push('')
  lines.push(`Dibuat: ${new Date().toISOString()}`)
  lines.push('')
  lines.push('Ruleset: WCAG 2.1 A + AA (axe-core, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`)')
  lines.push('')
  lines.push('## Ringkasan per Halaman')
  lines.push('')
  lines.push('| Halaman | Path | Status | Jumlah Violation |')
  lines.push('|---|---|---|---|')
  for (const r of allResults) {
    const statusLabel = r.status === 'scanned' ? 'Discan' : r.status === 'skipped' ? 'Di-skip' : 'ERROR'
    lines.push(`| ${r.label} | \`${r.path}\` | ${statusLabel}${r.note ? ` (${r.note})` : ''} | ${r.violations.length} |`)
  }
  lines.push('')
  lines.push(`**Total violation di seluruh halaman: ${totalViolations}**`)
  lines.push('')
  lines.push('## Dikelompokkan Berdasarkan Root Cause')
  lines.push('')
  lines.push(
    `Ditemukan ${groups.length} root cause unik. Untuk rule \`color-contrast\`, dikelompokkan berdasarkan pasangan warna foreground/background PERSIS (class Tailwind yang sama selalu hasilin pasangan warna yang sama, di halaman mana pun dia dipakai).`,
  )
  lines.push('')
  for (const [idx, g] of groups.entries()) {
    lines.push(`### ${idx + 1}. \`${g.ruleId}\` - ${g.occurrenceCount} kemunculan`)
    lines.push('')
    lines.push(`- **Deskripsi**: ${g.description}`)
    lines.push(`- **Impact**: ${g.impact ?? '-'}`)
    lines.push(`- **Referensi**: ${g.helpUrl}`)
    if (g.fgColor || g.bgColor) {
      lines.push(`- **Foreground**: \`${g.fgColor}\` | **Background**: \`${g.bgColor}\` | **Contrast Ratio**: ${g.contrastRatio ?? '-'}`)
    }
    lines.push(`- **Muncul di halaman**:`)
    const byPage = new Map<string, string[]>()
    for (const occ of g.occurrences) {
      const key = `${occ.label} (\`${occ.path}\`)`
      if (!byPage.has(key)) byPage.set(key, [])
      byPage.get(key)!.push(occ.selector)
    }
    for (const [pageKey, selectors] of byPage.entries()) {
      lines.push(`  - ${pageKey}`)
      for (const sel of selectors) {
        lines.push(`    - \`${sel}\``)
      }
    }
    lines.push('')
  }

  fs.writeFileSync(REPORT_MD_PATH, lines.join('\n'), 'utf-8')

  console.log(`\nLaporan JSON ditulis ke: ${REPORT_JSON_PATH}`)
  console.log(`Laporan Markdown ditulis ke: ${REPORT_MD_PATH}`)
}

function printSummary(): void {
  console.log('\n=== RINGKASAN A11Y SWEEP ===')
  for (const r of allResults) {
    const statusLabel = r.status === 'scanned' ? `${r.violations.length} violation` : r.status.toUpperCase()
    console.log(`  ${r.label.padEnd(40)} ${statusLabel}${r.note ? ` - ${r.note}` : ''}`)
  }
  const total = allResults.reduce((sum, r) => sum + r.violations.length, 0)
  console.log(`\nTOTAL VIOLATIONS (semua halaman): ${total}`)
  console.log('============================\n')
}
