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

/** Employee id=27 = akun QA Employee Test, role EMPLOYEE (dibuat khusus Task 9.5 - Employee Home, dijamin selalu ada). */
const EMPLOYEE_EMAIL = 'qa-employee-test@myjap.com'
const EMPLOYEE_PASSWORD = 'QaEmployeeTest123!'
const EMPLOYEE_TEST_ID = 27
const API_BASE = 'http://127.0.0.1:8000/api'

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
    // 2100s (bukan 1800s lagi) - Task 15b nambah 5 state baru, 2 di
    // antaranya blok gabungan tambah+cabut (Nominal per Jabatan, Override
    // Karyawan) yang masing-masing punya beberapa runAxe + fetch
    // SEKUENSIAL (usePositionRatesForComponents/useScheduledComponentResolution,
    // BUKAN Promise.all - lihat komentar hook-nya, N request paralel
    // ber-Authorization-header ke php artisan serve single-threaded di
    // dev HANG SELAMANYA). Ini bump ke-7, sama persis alasan bump-bump
    // sebelumnya (300->600->900->1200->1500->1800->2100) - pertimbangkan
    // paralelisasi beneran kalau ini kejadian lagi, sesuai catatan lama.
    test.setTimeout(2_100_000)

    // Distash SEKALI di step "Employee Home - Bersihkan..." (masih login
    // SUPER_ADMIN saat itu) - dipakai ULANG di step is_unrestricted/422 di
    // bawah, karena localStorage browser di titik itu SUDAH ke-overwrite
    // token EMPLOYEE (login ulang di step "State Awal"), gak bisa dibaca
    // ulang dari localStorage lagi.
    let superAdminToken: string | null = null

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
      // 60000 (bukan 15000 lagi) - 3x gagal berturut-turut PERSIS di step
      // ini pas mesin lagi tekanan RAM tinggi (Discord+beberapa window
      // VSCode+Excel+sesi Claude lain jalan bareng, free RAM sempat cuma
      // ~900MB dari 8GB total) - navigasi post-login beneran lambat karena
      // starvation, BUKAN bug di LoginPage/aplikasi (dikonfirmasi curl
      // langsung ke /api/login selalu 200 OK cepat di kondisi yang sama).
      // 15s ketat buat kondisi ini, 60s ngasih ruang tanpa nutupin
      // kegagalan asli (network/aplikasi beneran down tetap bakal timeout).
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 })
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

    // === MultiSelect Cabang arah CHECK_IN - state dropdown terbuka ===
    // scope_type dipecah 2 kolom (Task per-arah) - id field sekarang
    // #scope_type_check_in/#scope_type_check_out (BUKAN #scope_type
    // tunggal lagi), #office_location_ids_check_in/#office_location_ids_check_out
    // (BUKAN #office_location_ids tunggal).
    await safeStep('Detail Karyawan - MultiSelect Cabang Check-In (terbuka)', `/employees/${EMPLOYEE_EDIT_ID}`, async () => {
      await page.locator('#scope_type_check_in').selectOption('SPECIFIC_BRANCHES')
      const trigger = page.locator('#office_location_ids_check_in')
      await trigger.waitFor({ state: 'visible', timeout: 10000 })
      await trigger.click()
      await page.locator('input[type="checkbox"]').first().waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Detail Karyawan - MultiSelect Cabang Check-In (terbuka)', `/employees/${EMPLOYEE_EDIT_ID}`)
      await page.locator('input[type="checkbox"]').first().click()
      await page.getByRole('button', { name: 'Selesai' }).click()
      await page.locator('input[type="checkbox"]').first().waitFor({ state: 'hidden', timeout: 5000 })
    })

    // === Tab Pengecualian - 2 blok arah SEKALIGUS SPECIFIC_BRANCHES (Task per-arah) ===
    // Form lama cuma bisa 1 scope SPECIFIC_BRANCHES aktif dalam satu
    // waktu - sekarang KEDUA arah bisa punya sub-bagian Cabang terbuka
    // BARENGAN, state form paling kompleks yang mungkin, belum pernah
    // discan sebelumnya. Popover MultiSelect check-in di atas SUDAH
    // ketutup (klik "Selesai") - klik trigger check-out di sini gak
    // bakal nutup APA-APA punya check-in (udah ketutup duluan), murni
    // buat nampilin KEDUA field Cabang (trigger + chip terpilih)
    // sekaligus di layout, bukan 2 popover ke-expand bersamaan (klik
    // trigger lain otomatis nutup popover lain - behavior standar
    // "klik di luar nutup dropdown" MultiSelect.tsx, berlaku universal
    // ke semua instance-nya, dicek langsung ke komponennya).
    await safeStep('Detail Karyawan - Tab Pengecualian - 2 Blok Arah (SPECIFIC_BRANCHES)', `/employees/${EMPLOYEE_EDIT_ID}`, async () => {
      await page.locator('#scope_type_check_out').selectOption('SPECIFIC_BRANCHES')
      const triggerOut = page.locator('#office_location_ids_check_out')
      await triggerOut.waitFor({ state: 'visible', timeout: 10000 })
      await triggerOut.click()
      await page.locator('input[type="checkbox"]').first().waitFor({ state: 'visible', timeout: 10000 })
      await page.locator('input[type="checkbox"]').first().click()
      await page.getByRole('button', { name: 'Selesai' }).click()
      await page.locator('input[type="checkbox"]').first().waitFor({ state: 'hidden', timeout: 5000 })

      await runAxe(page, 'Detail Karyawan - Tab Pengecualian - 2 Blok Arah (SPECIFIC_BRANCHES)', `/employees/${EMPLOYEE_EDIT_ID}`)
    })

    // === Isi alasan -> submit -> Dialog Konfirmasi Submit ===
    await safeStep('Detail Karyawan - Dialog Konfirmasi Submit', `/employees/${EMPLOYEE_EDIT_ID}`, async () => {
      await page.locator('#reason').fill('a11y sweep - state terisi 2 arah buat scan aksesibilitas')
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

    // === Tab "Komponen Gaji" (Task 15b) - state kosong (referensi) ===
    await safeStep('Detail Karyawan - Komponen Gaji (kosong)', `/employees/${EMPLOYEE_EDIT_ID}`, async () => {
      await page.getByRole('button', { name: 'Komponen Gaji' }).click()
      await page.getByText('Default Jabatan').waitFor({ state: 'visible', timeout: 15000 })
      // usePositionRatesForComponents fetch SEKUENSIAL (bukan Promise.all -
      // lihat komentar hook-nya, N request paralel ber-Authorization-header
      // ke php artisan serve single-threaded di dev HANG SELAMANYA) lintas
      // semua komponen eligible - timeout digedein buat ini.
      await page.getByText('—').first().waitFor({ state: 'visible', timeout: 30000 })
      await runAxe(page, 'Detail Karyawan - Komponen Gaji (kosong)', `/employees/${EMPLOYEE_EDIT_ID}`)
    })

    // === Komponen Gaji - tambah+cabut override (mutating, AMAN - employee_salary_components TIDAK punya immutability guard/soft-delete, pola sama Wewenang Cabang di atas) ===
    await safeStep('Detail Karyawan - Komponen Gaji - Dialog Tambah/Cabut Override', `/employees/${EMPLOYEE_EDIT_ID}`, async () => {
      await page.locator('#add_override_component').selectOption({ label: 'Bonus' })
      await page.locator('#add_override_amount').fill('500000')
      await page.getByRole('button', { name: 'Tambah Override' }).click()
      const confirmAddDialog = page.getByRole('alertdialog')
      await confirmAddDialog.waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Detail Karyawan - Komponen Gaji - Dialog Konfirmasi Tambah Override', `/employees/${EMPLOYEE_EDIT_ID}`, '[role="alertdialog"]')
      await page.getByRole('button', { name: 'Ya, Simpan' }).click()
      await confirmAddDialog.waitFor({ state: 'hidden', timeout: 10000 })
      await page.getByText(/Rp\s*500\.000/).waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Detail Karyawan - Komponen Gaji (override terisi)', `/employees/${EMPLOYEE_EDIT_ID}`)

      // Cabut lagi - balikin employee QA ke state kosong.
      await page.getByRole('button', { name: /Cabut override/ }).click()
      const confirmRemoveDialog = page.getByRole('alertdialog')
      await confirmRemoveDialog.waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Detail Karyawan - Komponen Gaji - Dialog Konfirmasi Cabut Override', `/employees/${EMPLOYEE_EDIT_ID}`, '[role="alertdialog"]')
      await page.getByRole('button', { name: 'Ya, Cabut' }).click()
      await confirmRemoveDialog.waitFor({ state: 'hidden', timeout: 10000 })
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

    // === Komponen Gaji - Modal Tambah, field Kategori baru (Task 15b) ===
    // Non-mutating - buka modal, ganti Kategori (caption berubah per
    // pilihan), Batal tanpa submit.
    await safeStep('Komponen Gaji - Modal Tambah (field Kategori)', '/payroll/salary-components', async () => {
      await page.getByRole('button', { name: 'Tambah Komponen Gaji' }).click()
      await page.locator('#code').waitFor({ state: 'visible', timeout: 10000 })
      await page.locator('#category').selectOption('situational')
      await page.getByText(/Tidak ada nominal default tersimpan/).waitFor({ state: 'visible', timeout: 10000 })
      // is_required otomatis disabled+dipaksa "Tidak" pas situational -
      // state ini WAJIB discan (disabled Select punya kontras beda).
      await runAxe(page, 'Komponen Gaji - Modal Tambah (Kategori situational)', '/payroll/salary-components', '[role="dialog"]')
      await page.getByRole('button', { name: 'Batal' }).click()
    })

    // === Komponen Gaji - Modal Edit, section "Nominal per Jabatan" (Task 15b) ===
    // Mutating tapi AMAN buat permanent suite - position_salary_components
    // TIDAK punya immutability guard/soft-delete sama sekali (pola sama
    // Alur Approval Task 14: destroy() nyata, seed-mutate-cleanup lengkap
    // per run). Komponen "Bonus" (code BONUS, id asli/stabil) + jabatan
    // "Sorter" - dipilih karena TIDAK dipakai employee real manapun
    // (dikonfirmasi investigasi Task 15b), jadi nyalain rate ini sesaat
    // gak mempengaruhi perhitungan payroll siapapun.
    await safeStep('Komponen Gaji - Modal Edit (Nominal per Jabatan)', '/payroll/salary-components', async () => {
      await page.getByRole('row', { name: 'Bonus', exact: false }).getByLabel(/Edit/).click()
      await page.getByText('Nominal per Jabatan', { exact: true }).waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Komponen Gaji - Modal Edit (Nominal per Jabatan kosong)', '/payroll/salary-components', '[role="dialog"]')

      await page.locator('#add_position_rate_position').selectOption({ label: 'Sorter' })
      await page.locator('#add_position_rate_amount').fill('100000')
      await page.getByRole('button', { name: 'Tambah', exact: true }).click()
      const confirmAddDialog = page.getByRole('alertdialog')
      await confirmAddDialog.waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Komponen Gaji - Dialog Konfirmasi Tambah Nominal Jabatan', '/payroll/salary-components', '[role="alertdialog"]')
      await page.getByRole('button', { name: 'Ya, Simpan' }).click()
      await confirmAddDialog.waitFor({ state: 'hidden', timeout: 10000 })
      await page.getByText(/Rp\s*100\.000/).waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Komponen Gaji - Modal Edit (Nominal per Jabatan terisi)', '/payroll/salary-components', '[role="dialog"]')

      // Cabut lagi - balikin komponen Bonus ke state bersih (gak ada
      // jabatan manapun) buat run sweep berikutnya.
      await page.locator('button[aria-label^="Cabut"]').first().click()
      const confirmRemoveDialog = page.getByRole('alertdialog')
      await confirmRemoveDialog.waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Komponen Gaji - Dialog Konfirmasi Cabut Jabatan', '/payroll/salary-components', '[role="alertdialog"]')
      await page.getByRole('button', { name: 'Ya, Cabut' }).click()
      await page.getByText('Belum ada jabatan yang diatur untuk komponen ini.').waitFor({ state: 'visible', timeout: 10000 })
      await page.getByRole('button', { name: 'Batal' }).click()
    })

    // === /attendance (Task 10) - Monitoring Absensi Admin, masih login
    // SUPER_ADMIN (punya dashboard.view -> branch AttendanceRoute render
    // AttendanceMonitoringPage, bukan AttendanceHistoryPage EMPLOYEE). ===
    await safeStep('Monitoring Absensi - State Kosong (Rincian Harian & Ringkasan)', '/attendance', async () => {
      // Rentang tanggal jauh di masa lalu (2020) - dijamin kosong tanpa
      // perlu query dulu buat cek data eksisting apa, pola sama persis
      // trick "?page=2" buat state kosong Notifikasi di atas.
      await gotoAndSettle(page, '/attendance?start_date=2020-01-01&end_date=2020-01-02')
      await page.getByText('Belum ada data absensi untuk filter ini.').first().waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Monitoring Absensi - Rincian Harian (kosong)', '/attendance')

      await page.getByRole('button', { name: 'Ringkasan per Karyawan' }).click()
      await page.getByText('Belum ada data absensi untuk filter ini.').first().waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Monitoring Absensi - Ringkasan per Karyawan (kosong)', '/attendance')
    })

    await safeStep('Monitoring Absensi - State Terisi (Rincian Harian, Ringkasan, Dropdown Ekspor)', '/attendance', async () => {
      // Token session SUPER_ADMIN yang lagi aktif (localStorage, BUKAN
      // cookie) - page.request butuh header Authorization manual, gak
      // otomatis ikut kayak fetch dari dalam page - pola sama persis
      // step "Employee Home - Bersihkan..." di bawah.
      const token = await page.evaluate(() => {
        const raw = localStorage.getItem('myjap-auth')
        return raw ? (JSON.parse(raw)?.state?.token ?? null) : null
      })

      // Tanggal SENGAJA gak fixed - unique constraint attendances_employee_id_
      // attendance_date_unique di MariaDB TIDAK ngecualiin baris soft-deleted,
      // jadi tanggal hardcoded bakal PERMANEN nabrak DUPLICATE ENTRY di run
      // kedua dan seterusnya (baris seed run pertama soft-delete di cleanup
      // bawah, tapi tetap "ada" buat constraint) - ketemu beneran pas run
      // gagal dengan "Cannot read properties of undefined (reading 'id')"
      // (createBody.data undefined karena create-nya sendiri 500 duplicate
      // key, bukan bug di kode aplikasi Task 10). Offset hari di masa lalu
      // divariasikan per run (basis epoch ms) - virtually never re-hits
      // tanggal yang sama dua run beruntun, sekalian gak akan pernah ketimpa
      // data asli manapun. Employee 27 (QA Employee Test) + office 2
      // (Samarinda Branch, home office-nya sendiri) + koordinat PERSIS
      // Samarinda - lolos Attendance Location Policy default (ALL_BRANCHES)
      // tanpa perlu override ANYWHERE sama sekali (beda dari step Employee
      // Home di bawah yang butuh override buat kasus radius/dropdown).
      const daysAgo = 700 + (Date.now() % 1000)
      const seedDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const createRes = await page.request.post(`${API_BASE}/attendances`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        data: {
          employee_id: EMPLOYEE_TEST_ID,
          office_location_id: 2,
          attendance_date: seedDate,
          attendance_status: 'Present',
          check_in: `${seedDate} 08:00:00`,
          check_in_latitude: -0.502183,
          check_in_longitude: 117.153801,
        },
      })
      const createBody = await createRes.json()
      const seedAttendanceId = createBody.data.id

      await gotoAndSettle(page, `/attendance?start_date=${seedDate}&end_date=${seedDate}`)
      // table.getByText (BUKAN page.getByText polos) - dropdown "Karyawan"
      // punya <option value="27">QA Employee Test</option> yang SELALU
      // ada di DOM (walau gak "visible" secara native <select>), locator
      // gak di-scope bakal ketemu itu duluan (posisi DOM sebelum tabel),
      // ditemukan lewat error message Playwright pas verifikasi manual.
      await page.locator('table').getByText('QA Employee Test').first().waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Monitoring Absensi - Rincian Harian (terisi)', '/attendance')

      await page.getByRole('button', { name: 'Ringkasan per Karyawan' }).click()
      await page.getByRole('columnheader', { name: 'Hadir', exact: true }).waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Monitoring Absensi - Ringkasan per Karyawan (terisi)', '/attendance')

      // Dropdown "Ekspor" terbuka.
      await page.getByRole('button', { name: 'Ekspor' }).click()
      await page.getByRole('menu').waitFor({ state: 'visible', timeout: 5000 })
      await runAxe(page, 'Monitoring Absensi - Dropdown Ekspor (terbuka)', '/attendance')
      await page.keyboard.press('Escape')

      // Cleanup - baris seed ini gak perlu nyangkut buat run berikutnya.
      await page.request.delete(`${API_BASE}/attendances/${seedAttendanceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    })

    // === Cuti - Admin (Task 11) - login masih SUPER_ADMIN aktif ===
    await safeStep('Cuti - Admin - List Kosong', '/leave', async () => {
      await gotoAndSettle(page, '/leave?start_date=2099-01-01&end_date=2099-01-02')
      await page.getByText('Belum ada pengajuan cuti untuk filter ini.').waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Cuti - Admin - List Kosong', '/leave')
    })

    await safeStep('Cuti - Admin - List Terisi + Dialog Tolak', '/leave', async () => {
      const token = await page.evaluate(() => {
        const raw = localStorage.getItem('myjap-auth')
        return raw ? (JSON.parse(raw)?.state?.token ?? null) : null
      })

      // Seed 1 baris Pending sendiri (BUKAN pakai data existing yang
      // kebetulan Pending) - pola sama persis state lain di sweep ini,
      // supaya step ini gak coupled ke state DB yang bisa berubah kalau
      // baris existing itu diproses orang lain.
      const seedRes = await page.request.post(`${API_BASE}/leaves`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        data: {
          employee_id: EMPLOYEE_TEST_ID,
          leave_type: 'Sick Leave',
          start_date: '2099-06-01',
          end_date: '2099-06-01',
          reason: 'a11y sweep - seed Cuti Admin',
        },
      })
      const seedBody = await seedRes.json()
      const seedLeaveId = seedBody.data.id

      await gotoAndSettle(page, '/leave')
      const table = page.locator('table')
      await table.getByText('QA Employee Test').first().waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Cuti - Admin - List Terisi', '/leave')

      const seedRow = page.locator('tr', { has: page.getByText('1 Jun 2099') })
      await seedRow.getByRole('button', { name: 'Tolak' }).click()
      await page.getByRole('alertdialog').waitFor({ state: 'visible', timeout: 5000 })
      await runAxe(page, 'Cuti - Admin - Dialog Tolak (alasan wajib)', '/leave')
      await page.keyboard.press('Escape')

      // Cleanup - baris seed ini gak perlu nyangkut buat run berikutnya.
      await page.request.delete(`${API_BASE}/leaves/${seedLeaveId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    })

    // === Periode Payroll - Admin (Task 13) - login masih SUPER_ADMIN aktif ===
    //
    // Beda dari Leave/Attendance/Payslip di atas: PayrollPeriodController.php
    // SENGAJA gak punya route DELETE (dikonfirmasi investigasi Task 13,
    // periode cuma soft-deletable via kode/tinker langsung, gak ada endpoint
    // HTTP-nya sama sekali) - jadi seed+mutate+cleanup lewat page.request
    // TIDAK BISA dipakai di sini kayak state lain (bakal numpuk data uji
    // "Approved" yang keliatan asli permanen di List sungguhan, gak pernah
    // ke-cleanup). State di bawah ini SENGAJA cuma yang READ-ONLY/AMAN
    // (baca data existing asli, atau buka dialog lalu Escape TANPA confirm -
    // ConfirmDialog gak pernah mutate apapun sebelum tombol Confirm diklik).
    // Alur mutasi penuh (Submit->Approve level 1/2/3->Approved, + Reject)
    // divalidasi terpisah lewat curl manual (dicatat di laporan investigasi)
    // dan screenshot visual-review satu kali pakai (seed dibersihkan manual
    // via tinker sesudahnya) - BUKAN bagian permanent sweep ini.
    await safeStep('Periode Payroll - Admin - List Kosong', '/payroll/periods', async () => {
      await gotoAndSettle(page, '/payroll/periods?year=2015')
      await page.getByText('Belum ada periode payroll untuk filter ini.').waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Periode Payroll - Admin - List Kosong', '/payroll/periods')
    })

    await safeStep('Periode Payroll - Admin - List Terisi + Detail + Dialog Submit', '/payroll/periods', async () => {
      // TIDAK seed baris baru - data existing (4 Draft, 2 Published) sudah
      // cukup dan stabil, pola sama persis Slip Gaji Admin List Terisi.
      await gotoAndSettle(page, '/payroll/periods')
      const table = page.locator('table')
      // BUKAN 'tbody tr' polos - skeleton loading Table.tsx JUGA render
      // <tr> (animate-pulse), locator itu bisa resolve prematur ke
      // skeleton bukan data asli (ketemu nyata di visual-review script
      // Task 13 - skeleton yang ke-capture, bukan tabel terisi). Nunggu
      // teks kode periode asli (pola "REGULAR-") baru aman.
      await table.getByText(/REGULAR-/).first().waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Periode Payroll - Admin - List Terisi', '/payroll/periods')

      // Baris Draft (Submit button-nya cuma muncul buat status Draft) -
      // pola locator sama persis Cuti Admin (tr yang punya teks tertentu).
      const draftRow = table.locator('tbody tr', { has: page.getByText('Draft', { exact: true }) }).first()
      await draftRow.locator('button').first().click()
      await page.getByText('Alur Approval').waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Periode Payroll - Admin - Detail (Draft)', '/payroll/periods/:id')

      // === "Isi Data Periode" (Task 15b) - READ-ONLY di sini (baseline
      // gak ada posisi manapun yang punya komponen scheduled_variable
      // diatur, jadi section ini pasti render state kosong "Tidak ada
      // karyawan..." - aman, gak mutate apapun). Alur isi+generate penuh
      // divalidasi terpisah lewat skrip walkthrough sekali-pakai, sama
      // alasan alur Submit->Approve di atas.
      await page.getByText('Isi Data Periode').waitFor({ state: 'visible', timeout: 15000 })
      await page.getByText('Tidak ada karyawan dengan komponen Variabel Terjadwal').waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Periode Payroll - Admin - Isi Data Periode (kosong)', '/payroll/periods/:id')

      const submitButton = page.getByRole('button', { name: 'Submit', exact: true })
      await submitButton.waitFor({ state: 'visible', timeout: 5000 })
      await submitButton.click()
      await page.getByRole('alertdialog').waitFor({ state: 'visible', timeout: 5000 })
      await runAxe(page, 'Periode Payroll - Admin - Dialog Konfirmasi Submit', '/payroll/periods/:id')
      // Escape (BATAL, bukan konfirmasi) - ConfirmDialog gak mutate apapun
      // sebelum tombol "Ya, Submit" diklik, jadi periode existing ini TETAP
      // Draft sesudah step ini, aman buat run berikutnya tanpa cleanup.
      await page.keyboard.press('Escape')
    })

    // === Slip Gaji - Admin (Task 12) - login masih SUPER_ADMIN aktif ===
    await safeStep('Slip Gaji - Admin - List Kosong', '/payroll/payslips', async () => {
      await gotoAndSettle(page, '/payroll/payslips?month=1&year=2020')
      await page.getByText('Belum ada slip gaji untuk filter ini.').waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Slip Gaji - Admin - List Kosong', '/payroll/payslips')
    })

    await safeStep('Slip Gaji - Admin - List Terisi + Detail', '/payroll/payslips', async () => {
      // TIDAK seed baris baru - data existing (Ahmad Bagus/Employee
      // Testing RBAC/Dummy Testing Samarinda, campuran Draft+Published)
      // sudah cukup dan stabil buat state ini, pola sama persis kenapa
      // Riwayat Absensi/Cuti tertentu kadang reuse data existing kalau
      // memang sudah reliable - hindari nambah seed/cleanup yang gak perlu.
      await gotoAndSettle(page, '/payroll/payslips')
      const table = page.locator('table')
      await table.getByRole('button', { name: 'Lihat Detail' }).first().waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Slip Gaji - Admin - List Terisi', '/payroll/payslips')

      await table.getByRole('button', { name: 'Lihat Detail' }).first().click()
      const dialog = page.getByRole('dialog')
      await dialog.waitFor({ state: 'visible', timeout: 5000 })
      await dialog.getByText('Gaji Bersih (Netto)').waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Slip Gaji - Admin - Detail Modal', '/payroll/payslips', '[role="dialog"]')
      await page.keyboard.press('Escape')
    })

    // === Alur Approval - Admin (Task 14) - login masih SUPER_ADMIN aktif ===
    //
    // Workflow REGULAR (id=1, "Regular Payroll Approval") adalah data
    // LIVE, dipakai periode payroll nyata - TIDAK PERNAH disentuh/diedit/
    // dihapus di sweep ini. Semua state yang butuh data mutable pakai
    // period_type OFF_CYCLE (dipilih sengaja: belum pernah punya workflow
    // sama sekali sepanjang investigasi Task 14, jadi aman dipakai
    // berulang tanpa collision/side-effect ke workflow REGULAR yang aktif).
    //
    // "Delete ditolak" (workflow diblokir karena dipakai periode Submitted/
    // Approved) SENGAJA TIDAK ada di sini - PayrollPeriod gak punya route
    // create sama sekali (dikonfirmasi investigasi Task 14 Fase 1), jadi
    // gak ada cara seed periode Submitted untuk period_type non-REGULAR
    // lewat HTTP API murni (findOrCreateRegular cuma buat REGULAR).
    // Skenario itu sudah diverifikasi manual lewat curl+tinker terpisah,
    // bukan di sweep permanen ini.
    await safeStep('Alur Approval - Admin - List Kosong', '/payroll/approval-workflow', async () => {
      await gotoAndSettle(page, '/payroll/approval-workflow?period_type=OFF_CYCLE')
      await page.getByText('Belum ada alur approval untuk jenis periode', { exact: false }).waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Alur Approval - Admin - List Kosong', '/payroll/approval-workflow')
    })

    await safeStep('Alur Approval - Admin - List Terisi', '/payroll/approval-workflow', async () => {
      // TIDAK seed baris baru - workflow REGULAR asli sudah cukup buat
      // state ini, pola sama persis Slip Gaji Admin List Terisi di atas.
      await gotoAndSettle(page, '/payroll/approval-workflow')
      await page.getByText('Regular Payroll Approval').waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Alur Approval - Admin - List Terisi', '/payroll/approval-workflow')
    })

    await safeStep('Alur Approval - Admin - Dialog Tambah (kosong)', '/payroll/approval-workflow', async () => {
      await page.getByRole('button', { name: 'Tambah Alur Baru' }).click()
      const dialog = page.getByRole('dialog')
      await dialog.waitFor({ state: 'visible', timeout: 5000 })
      await dialog.getByText('Level 1').waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Alur Approval - Admin - Dialog Tambah (kosong)', '/payroll/approval-workflow', '[role="dialog"]')
      await page.keyboard.press('Escape')
    })

    await safeStep('Alur Approval - Admin - Dialog Tambah (terisi) + Edit + Validasi + Hapus', '/payroll/approval-workflow', async () => {
      const token = await page.evaluate(() => {
        const raw = localStorage.getItem('myjap-auth')
        return raw ? (JSON.parse(raw)?.state?.token ?? null) : null
      })
      let createdWorkflowId: number | null = null

      try {

        // --- Dialog Tambah, isi lengkap 2 step (scan SEBELUM submit) ---
        await page.getByRole('button', { name: 'Tambah Alur Baru' }).click()
        const addDialog = page.getByRole('dialog')
        await addDialog.waitFor({ state: 'visible', timeout: 5000 })

        await addDialog.locator('#name').fill('QA A11y Sweep - OFF_CYCLE Approval')
        await addDialog.locator('#applies_to_period_type').selectOption('OFF_CYCLE')
        await addDialog.getByRole('button', { name: 'Tambah Step' }).click()

        const roleSelects = addDialog.locator('select[id^="steps."][id$=".approver_role_id"]')
        await roleSelects.nth(0).waitFor({ state: 'visible', timeout: 5000 })
        const firstRoleValue = await roleSelects.nth(0).locator('option').nth(1).getAttribute('value')
        const secondRoleValue = await roleSelects.nth(1).locator('option').nth(2).getAttribute('value')
        await roleSelects.nth(0).selectOption(firstRoleValue!)
        await roleSelects.nth(1).selectOption(secondRoleValue!)
        await addDialog.locator('input[type="checkbox"]').first().check()

        await runAxe(page, 'Alur Approval - Admin - Dialog Tambah (terisi)', '/payroll/approval-workflow', '[role="dialog"]')

        await addDialog.getByRole('button', { name: 'Simpan' }).click()
        await page.getByText('berhasil ditambahkan', { exact: false }).waitFor({ state: 'visible', timeout: 15000 })

        const listRes = await page.request.get('http://127.0.0.1:8000/api/approval-workflows?period_type=OFF_CYCLE', {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        })
        const listBody = await listRes.json()
        createdWorkflowId = listBody.data[0]?.id ?? null

        // --- Dialog Edit (data baru tersimpan) ---
        const row = page.locator('tr', { has: page.getByText('QA A11y Sweep - OFF_CYCLE Approval') })
        await row.waitFor({ state: 'visible', timeout: 15000 })
        await row.getByLabel(/Edit/).click()
        const editDialog = page.getByRole('dialog')
        await editDialog.waitFor({ state: 'visible', timeout: 5000 })
        await editDialog.getByText('tidak bisa diubah setelah alur dibuat', { exact: false }).waitFor({ state: 'visible', timeout: 10000 })
        await runAxe(page, 'Alur Approval - Admin - Dialog Edit', '/payroll/approval-workflow', '[role="dialog"]')

        // --- Validasi client-side (kosongkan Nama, coba submit) ---
        await editDialog.locator('#name').fill('')
        await editDialog.getByRole('button', { name: 'Simpan' }).click()
        await editDialog.getByText('Nama alur wajib diisi').waitFor({ state: 'visible', timeout: 5000 })
        await runAxe(page, 'Alur Approval - Admin - Validasi Error', '/payroll/approval-workflow', '[role="dialog"]')
        await page.keyboard.press('Escape')

        // --- Dialog Konfirmasi Hapus ---
        await row.getByLabel(/Hapus/).click()
        const confirmDialog = page.getByRole('alertdialog')
        await confirmDialog.waitFor({ state: 'visible', timeout: 5000 })
        await runAxe(page, 'Alur Approval - Admin - Dialog Konfirmasi Hapus', '/payroll/approval-workflow', '[role="alertdialog"]')

        await confirmDialog.getByRole('button', { name: 'Ya, Lanjutkan' }).click()
        await page.getByText('berhasil dihapus', { exact: false }).waitFor({ state: 'visible', timeout: 15000 })
        createdWorkflowId = null // sudah kehapus lewat UI, gak perlu cleanup manual lagi

      } finally {

        // Jaring pengaman - kalau ada langkah di atas yang gagal SEBELUM
        // sempat kehapus lewat UI, tetap force-delete lewat API langsung
        // (bukan cuma soft-delete) biar gak numpuk row test tiap run gagal.
        if (createdWorkflowId) {
          await page.request.delete(`http://127.0.0.1:8000/api/approval-workflows/${createdWorkflowId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        }
      }
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

    // === Employee Home (Task 9.5) - login sebagai EMPLOYEE ===
    // Employee Home cuma bisa diakses role TANPA dashboard.view - beda
    // dari SEMUA state di atas yang pakai akun SUPER_ADMIN (QA_A11Y_SWEEP).
    // SENGAJA ditaruh PALING AKHIR sweep - ganti akun cuma sekali di sini,
    // gak perlu login balik ke SUPER_ADMIN lagi (gak ada state SUPER_ADMIN
    // lain sesudah section ini).
    await safeStep('Employee Home - Bersihkan absensi hari ini (persiapan)', '/', async () => {
      // Reset absensi HARI INI milik QA_EMPLOYEE_TEST via API langsung
      // (BUKAN klik UI - gak ada tombol hapus absensi buat role EMPLOYEE
      // sama sekali) pakai token SUPER_ADMIN yang MASIH aktif di
      // localStorage dari login paling awal skrip ini - biar scan "state
      // awal" (belum absen) di bawah selalu deterministik walau skrip ini
      // dijalankan berkali-kali di hari yang sama (constraint unique
      // employee_id+attendance_date bikin baris lama nyangkut kalau gak
      // dibersihkan dulu). Step berikutnya di section ini SELALU batalkan
      // dialog konfirmasi (bukan submit beneran), jadi section ini sendiri
      // TIDAK menciptakan baris baru yang perlu dibersihkan lagi setelahnya.
      superAdminToken = await page.evaluate(() => {
        const raw = localStorage.getItem('myjap-auth')
        return raw ? (JSON.parse(raw)?.state?.token ?? null) : null
      })
      const today = new Date().toISOString().slice(0, 10)
      const listRes = await page.request.get(
        `${API_BASE}/attendances?employee_id=${EMPLOYEE_TEST_ID}&start_date=${today}&end_date=${today}`,
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      )
      const listBody = await listRes.json()
      const existing = listBody.data?.[0]
      if (existing) {
        await page.request.delete(`${API_BASE}/attendances/${existing.id}`, {
          headers: { Authorization: `Bearer ${superAdminToken}` },
        })
      }
      // Jaga-jaga ada sisa override dari run lain yang error di tengah -
      // bersihin juga biar state "State Awal"/"is_unrestricted" di bawah deterministik.
      await page.request.delete(`${API_BASE}/employees/${EMPLOYEE_TEST_ID}/attendance-location-override`, {
        headers: { Authorization: `Bearer ${superAdminToken}`, Accept: 'application/json' },
      })
    })

    await safeStep('Employee Home - State Awal', '/', async () => {
      await page.goto('/login')
      await page.locator('#email').fill(EMPLOYEE_EMAIL)
      await page.locator('#password').fill(EMPLOYEE_PASSWORD)
      await page.getByRole('button', { name: 'Masuk' }).click()
      // 60000 - sama persis alasannya kayak login SUPER_ADMIN di atas.
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 60000 })
      await page.getByRole('main').getByText('Absensi Hari Ini').waitFor({ state: 'visible', timeout: 15000 })
      await page.getByRole('button', { name: 'Absen Masuk' }).waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Employee Home - State Awal', '/')
    })

    // === Employee Home - Form Absen Masuk (dropdown kantor + peringatan radius) ===
    // Geolocation di-mock ke Jakarta (jauh dari SEMUA 5 kantor asli di
    // Kalimantan Timur) - SENGAJA, biar peringatan "di luar radius"
    // beneran kepicu dan ikut kescan (elemen ini gak pernah muncul di
    // state manapun sebelumnya di seluruh sweep ini kalau gak dipaksa).
    // Kamera pakai fake device dari playwright.config.ts (launchOptions).
    await safeStep('Employee Home - Form Absen Masuk (dropdown + radius)', '/', async () => {
      await page.context().grantPermissions(['camera', 'geolocation'])
      await page.context().setGeolocation({ latitude: -6.2, longitude: 106.8167 })

      await page.getByRole('button', { name: 'Absen Masuk' }).click()
      await page.getByRole('heading', { name: 'Absen Masuk' }).waitFor({ state: 'visible', timeout: 5000 })
      await page.locator('#attendance-office').waitFor({ state: 'visible', timeout: 15000 })
      await page.getByText(/di luar radius kantor ini/).waitFor({ state: 'visible', timeout: 15000 })
      await page.getByRole('button', { name: 'Ambil Foto' }).waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Employee Home - Form Absen Masuk (dropdown + radius)', '/')
    })

    // === Employee Home - state setelah foto diambil ===
    await safeStep('Employee Home - Setelah Foto Diambil', '/', async () => {
      await page.getByRole('button', { name: 'Ambil Foto' }).click()
      await page.getByAltText('Foto absen yang sudah diambil').waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Employee Home - Setelah Foto Diambil', '/')
    })

    // === Employee Home - Dialog Konfirmasi Absen Masuk ===
    await safeStep('Employee Home - Dialog Konfirmasi Absen Masuk', '/', async () => {
      const submitBtn = page.getByRole('button', { name: 'Absen Masuk' }).last()
      await submitBtn.click()
      const dialog = page.getByRole('alertdialog')
      await dialog.waitFor({ state: 'visible', timeout: 10000 })
      await runAxe(page, 'Employee Home - Dialog Konfirmasi Absen Masuk', '/', '[role="alertdialog"]')
      // Batalkan (BUKAN konfirmasi beneran) - pola sama persis Dialog
      // Konfirmasi Hapus Notifikasi/Pulihkan Karyawan di atas: cukup scan
      // dialog-nya, jangan commit baris attendance permanen tiap sweep
      // dijalankan (submit lengkap sudah diverifikasi manual terpisah).
      // Locator "Batal" DI-SCOPE ke `dialog` (BUKAN `page.getByRole` polos)
      // - AttendanceCheckModal.tsx nge-stack 2 elemen sekaligus (Modal
      // "Absen Masuk" DI BAWAH + ConfirmDialog "Konfirmasi Absen Masuk" DI
      // ATAS, pola yang sama kayak EmployeeOfficeScopeTab), keduanya
      // punya tombol "Batal" sendiri-sendiri - locator gak di-scope bakal
      // strict-mode violation (ketemu 2 elemen).
      await dialog.getByRole('button', { name: 'Batal' }).click()
      await dialog.waitFor({ state: 'hidden', timeout: 5000 })
    })

    // === Employee Home - Form Absen Masuk dengan is_unrestricted (Task per-arah) ===
    // Setup override ANYWHERE khusus arah CHECK_IN via API, pakai
    // superAdminToken yang di-stash step "Bersihkan..." di atas -
    // localStorage browser SEKARANG isinya token EMPLOYEE (ke-overwrite
    // pas login ulang di step "State Awal"), gak bisa dibaca ulang dari
    // situ lagi buat aksi admin kayak gini.
    //
    // CATATAN: dropdown #attendance-office SENGAJA DIHAPUS buat scope
    // ANYWHERE (tugas "Revisi tampilan kantor untuk scope Bebas") - kantor
    // sekarang ditampilkan READ-ONLY (nama kantor asal karyawan), pola
    // sama persis kantor check-out. Assertion di bawah ngikutin behavior
    // BARU ini (bukan cek dropdown lagi) - lihat AttendanceCheckModal.tsx.
    await safeStep('Employee Home - Form Absen Masuk (is_unrestricted)', '/', async () => {
      await page.request.put(`${API_BASE}/employees/${EMPLOYEE_TEST_ID}/attendance-location-override`, {
        headers: { Authorization: `Bearer ${superAdminToken}`, Accept: 'application/json' },
        data: {
          scope_type_check_in: 'ANYWHERE',
          scope_type_check_out: 'HOME_ONLY',
          reason: 'a11y sweep - state is_unrestricted',
        },
      })

      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.getByRole('main').getByText('Absensi Hari Ini').waitFor({ state: 'visible', timeout: 15000 })
      await page.getByRole('button', { name: 'Absen Masuk' }).click()
      await page.getByRole('heading', { name: 'Absen Masuk' }).waitFor({ state: 'visible', timeout: 5000 })
      // Kantor asal (read-only) - Samarinda Branch (office_location_id=2, home office employee 27).
      await page.getByText('Samarinda Branch').waitFor({ state: 'visible', timeout: 15000 })
      // Section "Lokasi GPS" HARUS gak ada sama sekali buat scope ANYWHERE - hint ini yang jadi bukti section itu bener-bener gak dirender.
      await page.getByText(/bebas absen tanpa batasan radius/).waitFor({ state: 'visible', timeout: 10000 })
      await page.getByRole('button', { name: 'Ambil Foto' }).waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Employee Home - Form Absen Masuk (is_unrestricted)', '/')

      // Tutup modal (Batal) - state ini cuma buat scan, gak perlu submit.
      await page.getByRole('button', { name: 'Batal' }).click()
    })

    // === Employee Home - State Error 422 (Ditolak) ===
    await safeStep('Employee Home - State Error 422 (Ditolak)', '/', async () => {
      // Balikin ke kondisi NORMAL (hapus override ANYWHERE) - state ini
      // justru BUTUH submit BENERAN ditolak radius (geolocation masih
      // di-mock jauh dari step "Form Absen Masuk (dropdown + radius)"
      // sebelumnya, browser context yang sama). Aman disubmit sungguhan
      // karena 422 artinya TIDAK ADA baris attendance yang kesimpen sama
      // sekali (diverifikasi manual terpisah - lihat memory
      // project_employee_home_task95), gak perlu cleanup tambahan setelahnya.
      await page.request.delete(`${API_BASE}/employees/${EMPLOYEE_TEST_ID}/attendance-location-override`, {
        headers: { Authorization: `Bearer ${superAdminToken}`, Accept: 'application/json' },
      })

      await page.reload()
      await page.waitForLoadState('networkidle')
      await page.getByRole('main').getByText('Absensi Hari Ini').waitFor({ state: 'visible', timeout: 15000 })
      await page.getByRole('button', { name: 'Absen Masuk' }).click()
      await page.getByRole('heading', { name: 'Absen Masuk' }).waitFor({ state: 'visible', timeout: 5000 })
      await page.locator('#attendance-office').waitFor({ state: 'visible', timeout: 15000 })
      await page.getByText(/di luar radius kantor ini/).waitFor({ state: 'visible', timeout: 15000 })
      await page.getByRole('button', { name: 'Ambil Foto' }).waitFor({ state: 'visible', timeout: 15000 })
      await page.getByRole('button', { name: 'Ambil Foto' }).click()
      await page.getByAltText('Foto absen yang sudah diambil').waitFor({ state: 'visible', timeout: 5000 })

      const submitBtn = page.getByRole('button', { name: 'Absen Masuk' }).last()
      await submitBtn.click()
      const dialog = page.getByRole('alertdialog')
      await dialog.waitFor({ state: 'visible', timeout: 10000 })
      await dialog.getByRole('button', { name: 'Ya, Absen Masuk' }).click()

      await page.getByText(/Absen tidak berhasil/).first().waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Employee Home - State Error 422 (Ditolak)', '/')
    })

    // === Riwayat Absensi (Task 9.5b) - /attendance, role EMPLOYEE ===
    // Halaman baru "Riwayat Absensi" (nav Sidebar "Absensi", sebelumnya
    // dead link ke route yang belum terdaftar) - masih login EMPLOYEE
    // dari section Employee Home di atas, pakai superAdminToken yang
    // sama buat setup/teardown data via API.
    await safeStep('Riwayat Absensi - Bersihkan riwayat 90 hari (persiapan)', '/attendance', async () => {
      // Pastikan employee 27 BENERAN kosong dalam rentang 90 hari, biar
      // state "kosong" di bawah deterministik walau skrip ini dijalankan
      // berkali-kali (baris sisa dari run sebelumnya kalau ada - step
      // 422 di atas sendiri gak pernah nyimpen baris apa pun).
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const today = new Date().toISOString().slice(0, 10)
      const listRes = await page.request.get(
        `${API_BASE}/attendances?employee_id=${EMPLOYEE_TEST_ID}&start_date=${ninetyDaysAgo}&end_date=${today}&per_page=100`,
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      )
      const listBody = await listRes.json()
      for (const row of listBody.data ?? []) {
        await page.request.delete(`${API_BASE}/attendances/${row.id}`, {
          headers: { Authorization: `Bearer ${superAdminToken}` },
        })
      }
    })

    await safeStep('Riwayat Absensi - State Kosong', '/attendance', async () => {
      await gotoAndSettle(page, '/attendance')
      await page.getByText('Belum ada riwayat absensi dalam 3 bulan terakhir').waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Riwayat Absensi - State Kosong', '/attendance')
    })

    await safeStep('Riwayat Absensi - State Terisi (+ indikator luar radius)', '/attendance', async () => {
      // Seed 1 baris histori 5 hari lalu via API admin: override CHECK_IN
      // ANYWHERE SEMENTARA (skip validasi radius) biar baris tanpa
      // check_in_latitude/longitude (is_valid_location otomatis kehitung
      // false di backend) tetap TERSIMPAN, bukan ditolak 422 - pola sama
      // persis step "is_unrestricted"/"State Error 422" di atas.
      // check_out SENGAJA dikosongkan juga - sekalian nguji kolom "Jam
      // Pulang" nampilin "-".
      await page.request.put(`${API_BASE}/employees/${EMPLOYEE_TEST_ID}/attendance-location-override`, {
        headers: { Authorization: `Bearer ${superAdminToken}`, Accept: 'application/json' },
        data: {
          scope_type_check_in: 'ANYWHERE',
          scope_type_check_out: 'ANYWHERE',
          reason: 'a11y sweep - seed riwayat absensi',
        },
      })

      // Offset 3-5 hari (bukan selalu tepat 5) - sama alasan komentar di
      // step "Monitoring Absensi - State Terisi" di atas (unique constraint
      // gak ngecualiin soft-deleted, tanggal fixed nabrak DUPLICATE ENTRY
      // di run kedua di HARI YANG SAMA). Tetap harus kecil (bukan ratusan
      // hari kayak step Monitoring Absensi) - halaman ini navigasi TANPA
      // date-range query param, jadi harus tetap masuk default filter
      // "awal bulan ini - hari ini" milik halaman Riwayat Absensi sendiri.
      const daysAgo = 3 + (Date.now() % 3)
      const fiveDaysAgo = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const createRes = await page.request.post(`${API_BASE}/attendances`, {
        headers: { Authorization: `Bearer ${superAdminToken}`, Accept: 'application/json' },
        data: {
          employee_id: EMPLOYEE_TEST_ID,
          office_location_id: 2,
          attendance_date: fiveDaysAgo,
          attendance_status: 'Present',
          check_in: `${fiveDaysAgo} 08:15:00`,
        },
      })
      const createBody = await createRes.json()
      const seedAttendanceId = createBody.data.id

      // Balikin override - cuma dibutuhkan sesaat buat lolos create di atas.
      await page.request.delete(`${API_BASE}/employees/${EMPLOYEE_TEST_ID}/attendance-location-override`, {
        headers: { Authorization: `Bearer ${superAdminToken}`, Accept: 'application/json' },
      })

      await gotoAndSettle(page, '/attendance')
      await page.getByTitle('Di luar radius kantor').waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Riwayat Absensi - State Terisi (+ indikator luar radius)', '/attendance')

      // Cleanup - baris seed ini gak perlu nyangkut buat run berikutnya.
      await page.request.delete(`${API_BASE}/attendances/${seedAttendanceId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      })
    })

    // === Riwayat Absensi - Date Range Picker (Task 9.5b Bagian B) ===
    await safeStep('Riwayat Absensi - Date Range Picker (fokus)', '/attendance', async () => {
      await gotoAndSettle(page, '/attendance')
      await page.locator('#filter-start-date').waitFor({ state: 'visible', timeout: 15000 })
      // "Terbuka" - popup kalender native <input type="date"> dirender
      // browser DI LUAR DOM (OS-level widget) - sama kasus limitasi
      // Dashboard's #attendance-today-date (lihat step "Dashboard - Date
      // Picker Kehadiran (fokus)" di atas). Fokus pada input jadi proxy
      // DOM-scannable terdekat, axe gak bisa bedakan popup terbuka/tertutup.
      await page.locator('#filter-start-date').focus()
      await runAxe(page, 'Riwayat Absensi - Date Range Picker (fokus)', '/attendance')
    })

    await safeStep('Riwayat Absensi - Date Range Picker (terisi rentang custom)', '/attendance', async () => {
      // Ganti "Dari Tanggal" ke rentang custom beneran (bukan default 90
      // hari) - tunggu refetch (auto-apply onChange, TANPA tombol
      // "Terapkan") selesai sebelum scan, biar state yang kescan beneran
      // hasil rentang baru, bukan state transisi/loading.
      const rangeStart = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const rangeResPromise = page.waitForResponse(
        (res) => res.url().includes('/attendances?') && res.url().includes(`start_date=${rangeStart}`)
      )
      await page.locator('#filter-start-date').fill(rangeStart)
      await rangeResPromise
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(300)
      await runAxe(page, 'Riwayat Absensi - Date Range Picker (terisi rentang custom)', '/attendance')
    })

    // === Cuti - Karyawan (Task 11) - login masih EMPLOYEE aktif dari section Employee Home/Riwayat Absensi di atas ===
    await safeStep('Cuti - Karyawan - Form Kosong + Kuota', '/leave', async () => {
      await gotoAndSettle(page, '/leave')
      await page.getByLabel('Jenis Cuti').waitFor({ state: 'visible', timeout: 15000 })
      await page.getByText('Sisa Kuota Cuti Tahunan').waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Cuti - Karyawan - Form Kosong + Kuota', '/leave')
    })

    await safeStep('Cuti - Karyawan - Riwayat Terisi', '/leave', async () => {
      // superAdminToken yang di-stash step "Bersihkan..." (section
      // Employee Home) - pola sama persis step Riwayat Absensi State
      // Terisi di atas.
      const seedRes = await page.request.post(`${API_BASE}/leaves`, {
        headers: { Authorization: `Bearer ${superAdminToken}`, Accept: 'application/json' },
        data: {
          employee_id: EMPLOYEE_TEST_ID,
          leave_type: 'Sick Leave',
          start_date: '2099-07-01',
          end_date: '2099-07-01',
          reason: 'a11y sweep - seed Cuti Karyawan',
        },
      })
      const seedBody = await seedRes.json()
      const seedLeaveId = seedBody.data.id

      await gotoAndSettle(page, '/leave')
      await page.locator('table').getByText('Sick Leave').first().waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Cuti - Karyawan - Riwayat Terisi', '/leave')

      // Cleanup - baris seed ini gak perlu nyangkut buat run berikutnya.
      await page.request.delete(`${API_BASE}/leaves/${seedLeaveId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      })
    })

    // === Slip Gaji - Karyawan (Task 12) - login masih EMPLOYEE aktif ===
    await safeStep('Slip Gaji - Karyawan - State Kosong', '/payroll/payslips', async () => {
      // TIDAK perlu filter khusus buat state kosong - QA Employee Test
      // (id 27) memang belum pernah punya payslip sama sekali di data
      // existing (dikonfirmasi investigasi Task 12), jadi state default
      // SUDAH kosong tanpa perlu manipulasi apapun.
      await gotoAndSettle(page, '/payroll/payslips')
      await page.getByText('Belum ada slip gaji yang diterbitkan.').waitFor({ state: 'visible', timeout: 15000 })
      await runAxe(page, 'Slip Gaji - Karyawan - State Kosong', '/payroll/payslips')
    })

    await safeStep('Slip Gaji - Karyawan - State Terisi + Detail', '/payroll/payslips', async () => {
      // Payslip::create() via API TIDAK kena guard forceDeleting/updating
      // (itu cuma nyegat update/delete instance, bukan create) - seed
      // dan cleanup POST/DELETE biasa aman, pola sama persis Leave/
      // Attendance di atas. superAdminToken dari step "Bersihkan..."
      // (section Employee Home).
      const seedRes = await page.request.post(`${API_BASE}/payslips`, {
        headers: { Authorization: `Bearer ${superAdminToken}`, Accept: 'application/json' },
        data: {
          employee_id: EMPLOYEE_TEST_ID,
          month: 8,
          year: 2099,
          items: [
            { salary_component_id: 1, amount: 4000000 },
          ],
        },
      })
      const seedBody = await seedRes.json()
      const seedPayslipId = seedBody.data.id
      let isPublished = false

      // try/finally WAJIB di sini (beda dari step Leave/Attendance yang
      // gak butuh) - publish() bisa gagal kalau period_type REGULAR
      // punya ApprovalWorkflow aktif (harus Submitted->Approved dulu,
      // di luar kendali/scope test ini) - kalau throw di tengah TANPA
      // finally, DELETE di bawah gak pernah kepanggil, payslip Draft
      // yatim numpuk tiap run gagal. Ditemukan investigasi Task 12: DB
      // sekarang MEMANG punya workflow REGULAR aktif dan approve()-nya
      // sendiri lagi bug (audit_logs.description varchar(255) kepotong
      // sama pesan notifikasi "tidak ada FINANCE aktif" yang lebih
      // panjang dari itu) - keduanya di luar scope Task 12 (Payroll
      // Period/Approval, bukan Payslip view-only), backend freeze,
      // dilaporkan terpisah, TIDAK diperbaiki di sini.
      try {

        const publishRes = await page.request.post(`${API_BASE}/payslips/${seedPayslipId}/publish`, {
          headers: { Authorization: `Bearer ${superAdminToken}`, Accept: 'application/json' },
        })
        const publishBody = await publishRes.json()
        isPublished = publishBody.success === true

        if (!isPublished) {
          throw new Error(`Publish payslip seed gagal (kemungkinan ApprovalWorkflow REGULAR aktif + approve() bug - di luar scope Task 12): ${publishBody.message}`)
        }

        await gotoAndSettle(page, '/payroll/payslips')
        const table = page.locator('table')
        await table.getByText('Agustus 2099').first().waitFor({ state: 'visible', timeout: 15000 })
        await runAxe(page, 'Slip Gaji - Karyawan - State Terisi', '/payroll/payslips')

        await table.getByRole('button', { name: 'Lihat Detail' }).first().click()
        const dialog = page.getByRole('dialog')
        await dialog.waitFor({ state: 'visible', timeout: 5000 })
        await dialog.getByText('Gaji Bersih (Netto)').waitFor({ state: 'visible', timeout: 15000 })
        await runAxe(page, 'Slip Gaji - Karyawan - Detail Modal', '/payroll/payslips', '[role="dialog"]')
        await page.keyboard.press('Escape')

      } finally {

        // Cleanup - baris seed ini gak perlu nyangkut buat run berikutnya,
        // GARANSI jalan walau block di atas throw (publish gagal dsb).
        // Payslip::booted() blokir instance forceDelete() SELAMANYA
        // (guard financial-record) - DELETE /payslips/{id} biasa (soft
        // delete) TETAP diblokir kalau status Published (destroy() nolak
        // 422), jadi unpublish dulu balik ke Draft - TAPI cuma kalau
        // beneran berhasil Published (unpublish() sendiri nolak 422
        // kalau status masih Draft, lihat isPublished guard).
        if (isPublished) {
          await page.request.post(`${API_BASE}/payslips/${seedPayslipId}/unpublish`, {
            headers: { Authorization: `Bearer ${superAdminToken}`, Accept: 'application/json' },
            data: { unpublish_reason: 'a11y sweep cleanup' },
          })
        }
        await page.request.delete(`${API_BASE}/payslips/${seedPayslipId}`, {
          headers: { Authorization: `Bearer ${superAdminToken}` },
        })
      }
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
