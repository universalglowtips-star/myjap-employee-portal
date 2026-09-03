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
    // 900s (bukan 600s lagi) - sweep terus nambah (Task 7 Dashboard +3,
    // Task 9 Notifikasi +4 state baru), run terakhir kena 10-11 menit,
    // mepet/lewatin limit lama. Semua state TETAP 0 violation waktu kena
    // timeout - ini murni budget waktu test-nya, bukan bug aksesibilitas.
    test.setTimeout(900_000)

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

    // === / (Dashboard, Task 7) - state awal load (KPI cards + chart default 7 hari) ===
    await safeStep('Dashboard - Awal Load', '/', async () => {
      await gotoAndSettle(page, '/')
      // Tunggu skeleton loading BENERAN hilang (bukan waitForTimeout
      // blind) - KpiCard render label duluan, angka baru muncul begitu
      // isLoading false. `.animate-pulse` = kelas skeleton di KpiCard.tsx
      // & AttendanceTrendChart.tsx.
      await page.locator('.animate-pulse').first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
      await page.getByText('Tren Kehadiran Harian').waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Dashboard - Awal Load', '/')
    })

    // === Dashboard - date picker "Kehadiran Hari Ini" ===
    // CATATAN: <input type="date"> NATIVE - popup kalendernya dirender
    // browser di LUAR DOM (OS-level widget), sama persis kasus <select>
    // native di Task 8e (Dropdown Tambah Cabang) - axe gak bisa scan
    // beda dari state tertutup. Yang di-scan proxy terdekat yang
    // beneran DOM-scannable: state fokus pada input-nya.
    await safeStep('Dashboard - Date Picker Kehadiran (fokus)', '/', async () => {
      await page.locator('#attendance-today-date').focus()
      await runAxe(page, 'Dashboard - Date Picker Kehadiran (fokus)', '/')
    })

    // === Dashboard - selector hari diubah ke 30 hari ===
    await safeStep('Dashboard - Tren Kehadiran (30 hari)', '/', async () => {
      const button30 = page.getByRole('button', { name: '30 Hari' })
      await button30.click()
      // Tunggu tombol beneran keganti aria-pressed (state React commit),
      // bukan waitForTimeout blind - sinyal DOM nyata bahwa re-render
      // (dan refetch data 30 hari) sudah kejadian.
      await page.waitForFunction(
        () => document.querySelector('button[aria-pressed="true"]')?.textContent === '30 Hari',
        null,
        { timeout: 10000 }
      )
      await page.waitForTimeout(300)
      await runAxe(page, 'Dashboard - Tren Kehadiran (30 hari)', '/')
    })

    // === Notifikasi (Task 9) - Dropdown Topbar (terbuka) ===
    // Butuh data asli (bukan kosong) - employee QA_A11Y_SWEEP (id=25)
    // punya 5 notifikasi persisten yang sengaja di-seed permanen khusus
    // buat state ini (pola sama persis QA Archive Test/QA A11y Sweep
    // Test) - mencakup ke-3 kategori sentiment (positif/negatif/netral)
    // PLUS 1 type yang gak dikenal frontend (uji fallback defensif).
    // Selector bell PRESISI via aria-haspopup="true" (unik, BUKAN cari
    // teks "Notifikasi" polos - itu bisa nabrak tombol hapus notifikasi
    // lain yang judulnya kebetulan mengandung kata sama).
    await safeStep('Notifikasi - Dropdown Topbar (terbuka)', '/', async () => {
      const bell = page.locator('button[aria-haspopup="true"]')
      await bell.waitFor({ state: 'visible', timeout: 15000 })
      await bell.click()
      await page.getByText('Lihat Semua').waitFor({ state: 'visible', timeout: 15000 })
      await page.locator('header .animate-pulse').first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
      await page.getByText('Pengajuan Cuti Disetujui').waitFor({ state: 'visible', timeout: 15000 })
      // Full-page scan (BUKAN scoped ke satu selector) - dropdown ini
      // panel biasa nempel di DOM, bukan role="dialog"/portal - pola
      // sama persis MultiSelect Cabang (Task 8d) yang juga di-scan full
      // page pas terbuka.
      await runAxe(page, 'Notifikasi - Dropdown Topbar (terbuka)', '/')
    })

    // === Notifikasi - Halaman Penuh (terisi) ===
    await safeStep('Notifikasi - Halaman Penuh (terisi)', '/notifications', async () => {
      await gotoAndSettle(page, '/notifications')
      await page.getByText('Pengajuan Cuti Disetujui').waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Notifikasi - Halaman Penuh (terisi)', '/notifications')
    })

    // === Notifikasi - Halaman Penuh (kosong) ===
    // TRIK non-destruktif: page=2 dari 5 notifikasi (per_page=15) PASTI
    // kosong TANPA perlu hapus data seed beneran - Table.tsx render
    // emptyMessage bawaan begitu `data` kosong, seed 5 notifikasi
    // persisten tetap utuh di page=1 buat run berikutnya.
    await safeStep('Notifikasi - Halaman Penuh (kosong)', '/notifications?page=2', async () => {
      await gotoAndSettle(page, '/notifications?page=2')
      await page.getByText('Tidak ada notifikasi.').waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Notifikasi - Halaman Penuh (kosong)', '/notifications?page=2')
    })

    // === Notifikasi - Dialog Konfirmasi Hapus ===
    // Dialog DIBATALKAN (bukan dikonfirmasi) di akhir step - seed 5
    // notifikasi persisten harus TETAP utuh buat run berikutnya, pola
    // sama persis kenapa "kosong" di atas pakai trik pagination
    // ketimbang hapus data beneran.
    await safeStep('Notifikasi - Dialog Konfirmasi Hapus', '/notifications', async () => {
      await gotoAndSettle(page, '/notifications')
      const deleteButton = page.locator('button[aria-label^="Hapus notifikasi"]').first()
      await deleteButton.waitFor({ state: 'visible', timeout: 10000 })
      await deleteButton.click()
      const dialog = page.getByRole('alertdialog')
      await dialog.waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Notifikasi - Dialog Konfirmasi Hapus', '/notifications', '[role="alertdialog"]')
      await page.getByRole('button', { name: 'Batal' }).click()
      await dialog.waitFor({ state: 'hidden', timeout: 5000 })
    })

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

    // === Dialog Konfirmasi Pulihkan Karyawan (Task 8f) ===
    // Butuh minimal 1 baris arsip buat klik tombol Pulihkan - employee
    // id=26 ("QA Archive Test") sengaja dibuat & diarsipkan permanen
    // khusus buat state ini (pola sama persis QA_A11Y_SWEEP/QA Director
    // Test). Dialog di-BATALKAN (bukan dikonfirmasi) di akhir step -
    // employee ini harus TETAP di arsip biar run berikutnya juga bisa
    // klik Pulihkan lagi, deterministik, gak butuh setup ulang tiap run.
    await safeStep('Karyawan - Arsip - Dialog Konfirmasi Pulihkan', '/employees/archive', async () => {
      const pulihkanButton = page.locator('button[aria-label^="Pulihkan "]').first()
      await pulihkanButton.waitFor({ state: 'visible', timeout: 15000 })
      await pulihkanButton.click()
      const dialog = page.getByRole('alertdialog')
      await dialog.waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Karyawan - Arsip - Dialog Konfirmasi Pulihkan', '/employees/archive', '[role="alertdialog"]')
      await page.getByRole('button', { name: 'Batal' }).click()
      await dialog.waitFor({ state: 'hidden', timeout: 5000 })
    })

    // === /employees/{id} (Detail Karyawan, Task 8d) - Tab Info ===
    await safeStep('Detail Karyawan - Tab Info', `/employees/${EMPLOYEE_EDIT_ID}`, async () => {
      await gotoAndSettle(page, `/employees/${EMPLOYEE_EDIT_ID}`)
      await runAxe(page, 'Detail Karyawan - Tab Info', `/employees/${EMPLOYEE_EDIT_ID}`)
    })

    // === Tab "Pengecualian Lokasi Absensi" - state kosong ===
    // Dibersihkan dulu (klik Hapus Override kalau ada sisa dari run
    // sebelumnya) SUPAYA state "kosong" yang di-scan beneran deterministik,
    // gak nebak-nebak state basi dari run lain.
    await safeStep('Detail Karyawan - Tab Pengecualian (kosong)', `/employees/${EMPLOYEE_EDIT_ID}`, async () => {
      await page.getByRole('button', { name: 'Pengecualian Lokasi Absensi' }).click()
      await page.getByText('Memuat data pengecualian lokasi absensi...').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
      // Race: baik pesan empty state MAUPUN badge status (kalau kebetulan
      // masih ada sisa override) valid sebagai sinyal "data selesai
      // di-load" - BUKAN waitForTimeout tetap (pelajaran bug Supervisor
      // tab sebelumnya: axe pernah kescan pas UI masih di state loading).
      await Promise.race([
        page.getByText('belum memiliki pengecualian lokasi absensi').waitFor({ state: 'visible', timeout: 15000 }),
        page.getByRole('button', { name: 'Hapus Override' }).waitFor({ state: 'visible', timeout: 15000 }),
      ])

      const hapusButton = page.getByRole('button', { name: 'Hapus Override' })
      if (await hapusButton.isVisible().catch(() => false)) {
        await hapusButton.click()
        const dialog = page.getByRole('alertdialog')
        await dialog.waitFor({ state: 'visible', timeout: 10000 })
        await page.getByRole('button', { name: 'Ya, Hapus' }).click()
        await page.getByText('belum memiliki pengecualian lokasi absensi').waitFor({ state: 'visible', timeout: 15000 })
      }

      await runAxe(page, 'Detail Karyawan - Tab Pengecualian (kosong)', `/employees/${EMPLOYEE_EDIT_ID}`)
    })

    // === Isi form (scope ALL_BRANCHES, gak butuh MultiSelect) -> Dialog Konfirmasi Submit ===
    await safeStep('Detail Karyawan - Dialog Konfirmasi Submit', `/employees/${EMPLOYEE_EDIT_ID}`, async () => {
      await page.locator('#scope_type').selectOption('ALL_BRANCHES')
      await page.locator('#reason').fill('a11y sweep - state terisi buat scan aksesibilitas')
      await page.getByRole('button', { name: 'Simpan' }).click()
      const dialog = page.getByRole('alertdialog')
      await dialog.waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Detail Karyawan - Dialog Konfirmasi Submit', `/employees/${EMPLOYEE_EDIT_ID}`, '[role="alertdialog"]')
      await page.getByRole('button', { name: 'Ya, Simpan' }).click()
      await page.getByText('berhasil disimpan').waitFor({ state: 'visible', timeout: 15000 })
    })

    // === Tab "Pengecualian Lokasi Absensi" - state terisi (ada override aktif) ===
    await safeStep('Detail Karyawan - Tab Pengecualian (terisi)', `/employees/${EMPLOYEE_EDIT_ID}`, async () => {
      await page.getByText('Aktif Sekarang').waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Detail Karyawan - Tab Pengecualian (terisi)', `/employees/${EMPLOYEE_EDIT_ID}`)
    })

    // === MultiSelect office_location_ids - state dropdown terbuka ===
    await safeStep('Detail Karyawan - MultiSelect Cabang (terbuka)', `/employees/${EMPLOYEE_EDIT_ID}`, async () => {
      await page.locator('#scope_type').selectOption('SPECIFIC_BRANCHES')
      const trigger = page.locator('#office_location_ids')
      await trigger.waitFor({ state: 'visible', timeout: 10000 })
      await trigger.click()
      await page.locator('input[type="checkbox"]').first().waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Detail Karyawan - MultiSelect Cabang (terbuka)', `/employees/${EMPLOYEE_EDIT_ID}`)
      await page.getByRole('button', { name: 'Selesai' }).click()
      await page.locator('input[type="checkbox"]').first().waitFor({ state: 'hidden', timeout: 5000 })
      // Balik ke ALL_BRANCHES - override yang mau dihapus di step berikut
      // masih yang tersimpan (ALL_BRANCHES), bukan SPECIFIC_BRANCHES yang
      // belum disimpan di step ini.
      await page.locator('#scope_type').selectOption('ALL_BRANCHES')
    })

    // === Dialog Konfirmasi Hapus + bersihin data test ===
    await safeStep('Detail Karyawan - Dialog Konfirmasi Hapus', `/employees/${EMPLOYEE_EDIT_ID}`, async () => {
      await page.getByRole('button', { name: 'Hapus Override' }).click()
      const dialog = page.getByRole('alertdialog')
      await dialog.waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Detail Karyawan - Dialog Konfirmasi Hapus', `/employees/${EMPLOYEE_EDIT_ID}`, '[role="alertdialog"]')
      // Konfirmasi beneran (bukan cancel) - balikin employee QA ke state
      // kosong lagi setelah sweep, biar run berikutnya mulai dari state
      // yang deterministik juga (persis alasan step "kosong" di atas
      // ngecek & bersihin dulu di awal).
      await page.getByRole('button', { name: 'Ya, Hapus' }).click()
      await page.getByText('belum memiliki pengecualian lokasi absensi').waitFor({ state: 'visible', timeout: 15000 })
    })

    // === Tab "Wewenang Cabang" (Task 8e) - state kosong ===
    // Dibersihkan dulu (persis pola Tab Pengecualian di atas) SUPAYA
    // state "kosong" yang di-scan beneran deterministik.
    await safeStep('Detail Karyawan - Wewenang Cabang (kosong)', `/employees/${EMPLOYEE_EDIT_ID}`, async () => {
      await page.getByRole('button', { name: 'Wewenang Cabang' }).click()
      await page.getByText('Memuat data wewenang cabang...').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {})
      await Promise.race([
        page.getByText('belum memiliki wewenang cabang apa pun').waitFor({ state: 'visible', timeout: 15000 }),
        page.locator('button[aria-label^="Cabut wewenang"]').first().waitFor({ state: 'visible', timeout: 15000 }),
      ])

      const removeButtons = page.locator('button[aria-label^="Cabut wewenang"]')
      while ((await removeButtons.count()) > 0) {
        await removeButtons.first().click()
        const dlg = page.getByRole('alertdialog')
        await dlg.waitFor({ state: 'visible', timeout: 10000 })
        await Promise.all([
          page.waitForResponse((res) => res.url().includes('/office-scopes') && res.request().method() === 'GET', { timeout: 10000 }),
          page.getByRole('button', { name: 'Ya, Cabut' }).click(),
        ])
      }
      await page.getByText('belum memiliki wewenang cabang apa pun').waitFor({ state: 'visible', timeout: 15000 })

      await runAxe(page, 'Detail Karyawan - Wewenang Cabang (kosong)', `/employees/${EMPLOYEE_EDIT_ID}`)
    })

    // === Dropdown "Tambah Cabang" - state fokus ===
    // CATATAN: ini <select> NATIVE (bukan MultiSelect custom kayak
    // office_location_ids Task 8d) - popup opsi native <select> dirender
    // browser di LUAR DOM (OS-level widget), axe-core (yang scan DOM)
    // gak bisa "lihat" state itu sama sekali beda dari state tertutup.
    // Yang di-scan di sini state FOKUS (:focus-visible beneran beda
    // secara DOM/CSS) - proxy paling dekat yang beneran bisa di-scan.
    await safeStep('Detail Karyawan - Dropdown Tambah Cabang (fokus)', `/employees/${EMPLOYEE_EDIT_ID}`, async () => {
      await page.locator('#add_office_scope').focus()
      await runAxe(page, 'Detail Karyawan - Dropdown Tambah Cabang (fokus)', `/employees/${EMPLOYEE_EDIT_ID}`)
    })

    // === Tambah 1 cabang -> Dialog Konfirmasi Tambah ===
    await safeStep('Detail Karyawan - Wewenang Cabang - Dialog Konfirmasi Tambah', `/employees/${EMPLOYEE_EDIT_ID}`, async () => {
      await page.locator('#add_office_scope').selectOption({ index: 1 })
      const dialog = page.getByRole('alertdialog')
      await dialog.waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Detail Karyawan - Wewenang Cabang - Dialog Konfirmasi Tambah', `/employees/${EMPLOYEE_EDIT_ID}`, '[role="alertdialog"]')
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/office-scopes') && res.request().method() === 'GET', { timeout: 10000 }),
        page.getByRole('button', { name: 'Ya, Tambahkan' }).click(),
      ])
      await page.locator('button[aria-label^="Cabut wewenang"]').first().waitFor({ state: 'visible', timeout: 10000 })
    })

    // === Wewenang Cabang - state terisi ===
    await safeStep('Detail Karyawan - Wewenang Cabang (terisi)', `/employees/${EMPLOYEE_EDIT_ID}`, async () => {
      await runAxe(page, 'Detail Karyawan - Wewenang Cabang (terisi)', `/employees/${EMPLOYEE_EDIT_ID}`)
    })

    // === Dialog Konfirmasi Hapus wewenang + bersihin data test ===
    await safeStep('Detail Karyawan - Wewenang Cabang - Dialog Konfirmasi Hapus', `/employees/${EMPLOYEE_EDIT_ID}`, async () => {
      await page.locator('button[aria-label^="Cabut wewenang"]').first().click()
      const dialog = page.getByRole('alertdialog')
      await dialog.waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Detail Karyawan - Wewenang Cabang - Dialog Konfirmasi Hapus', `/employees/${EMPLOYEE_EDIT_ID}`, '[role="alertdialog"]')
      // Konfirmasi beneran - balikin employee QA ke state kosong lagi
      // setelah sweep, pola sama persis Tab Pengecualian di atas.
      await Promise.all([
        page.waitForResponse((res) => res.url().includes('/office-scopes') && res.request().method() === 'GET', { timeout: 10000 }),
        page.getByRole('button', { name: 'Ya, Cabut' }).click(),
      ])
      await page.getByText('belum memiliki wewenang cabang apa pun').waitFor({ state: 'visible', timeout: 15000 })
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
