<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePayslipRequest;
use App\Http\Requests\UpdatePayslipRequest;

use App\Models\Employee;
use App\Models\Payslip;
use App\Models\PayslipItem;
use App\Models\PayrollPeriod;
use App\Models\SalaryComponent;
use App\Models\CompanySetting;
use App\Models\Notification;
use App\Services\AuditLogService;
use App\Traits\ScopesOwnData;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Barryvdh\DomPDF\Facade\Pdf;
use Exception;

class PayslipController extends Controller
{
use ScopesOwnData;

    /**
     * Generate & download PDF slip gaji.
     */
    public function pdf(Request $request, string $id)
    {
        $payslip = Payslip::with([
            'employee',
            'department',
            'officeLocation',
            'items.salaryComponent'
        ])->findOrFail($id);

        $this->ensureOwnDataOrAdmin($request, $payslip->employee_id);
        $this->ensurePublishedOrAdmin($request, $payslip->status);

        $filename = sprintf(
            'Slip-Gaji-%s-%02d-%d.pdf',
            str_replace(' ', '-', $payslip->employee->full_name),
            $payslip->month,
            $payslip->year
        );

        // Slip yang sudah Published adalah ARSIP FINAL - selalu serve file
        // yang sudah dibekukan saat publish, JANGAN regenerate dari data
        // live (kalau nama komponen/data perusahaan berubah nanti, slip
        // yang sudah di-download orang tidak boleh ikut berubah).
        if ($payslip->status === 'Published') {

            if (!$payslip->file_pdf || !Storage::disk('public')->exists($payslip->file_pdf)) {
                // Data lama sebelum fitur arsip ini ada, atau file kehilangan
                // secara tidak sengaja - generate & simpan sekali sebagai
                // pemulihan, SETELAH ini akan selalu jadi arsip yang sama.
                $payslip->file_pdf = $this->generateAndStorePayslipPdf($payslip);
                $payslip->saveQuietly(); // saveQuietly - hindari trigger guard/observer lain buat sekadar isi path file
            }

            return Storage::disk('public')->download($payslip->file_pdf, $filename);
        }

        // Draft/belum Published - boleh preview dinamis, karena datanya
        // memang masih bisa berubah sebelum final.
        $pdf = Pdf::loadView('pdf.payslip', [
            'payslip' => $payslip,
            'company' => CompanySetting::current(),
        ])->setPaper('a4', 'portrait');

        return $pdf->download($filename);
    }

    /**
     * Render PDF dan simpan sebagai file fisik - dipanggil waktu publish()
     * ATAU waktu recovery (file hilang, storage rusak, dll).
     *
     * PENTING (opsi B - PDF recoverable dari snapshot, bukan master data):
     * snapshot company/employee CUMA dibekukan SEKALI, di percobaan
     * pertama (biasanya pas publish). Kalau dipanggil lagi nanti buat
     * recovery, snapshot yang SUDAH ADA dipakai apa adanya - TIDAK
     * pernah nge-query ulang ke CompanySetting/Employee. Jadi hasil
     * regenerate dijamin identik sama versi aslinya, walau data
     * perusahaan/karyawan sudah berubah atau server sudah pindah.
     */
    private function generateAndStorePayslipPdf(Payslip $payslip): string
    {
        $payslip->loadMissing(['employee', 'department', 'officeLocation', 'items']);

        if (!$payslip->pdf_generated_at) {

            $company = CompanySetting::current();

            $payslip->company_name_snapshot = $company->company_name;
            $payslip->company_address_snapshot = $company->address;
            $payslip->company_phone_snapshot = $company->phone;
            $payslip->company_email_snapshot = $company->email;
            $payslip->employee_name_snapshot = $payslip->employee->full_name;
            $payslip->employee_code_snapshot = $payslip->employee->employee_code;
            $payslip->pdf_generated_at = now();

            $payslip->saveQuietly();
        }

        $pdf = Pdf::loadView('pdf.payslip', [
            'payslip' => $payslip,
            'company' => CompanySetting::current(), // fallback aja - snapshot di atas sudah dijamin ke-isi duluan
        ])->setPaper('a4', 'portrait');

        $path = "payslips/payslip-{$payslip->id}-" . now()->format('YmdHis') . ".pdf";

        Storage::disk('public')->put($path, $pdf->output());

        return $path;
    }
    /**
     * Display all payslips.
     *
     * Query params yang didukung:
     * - employee_id   : filter berdasarkan karyawan
     * - department_id : filter berdasarkan departemen karyawan
     * - month, year   : filter periode
     * - status        : Draft | Published
     * - search        : cari nama karyawan
     * - per_page      : jumlah data per halaman (default 10)
     */
    public function index(Request $request): JsonResponse
    {
        $query = Payslip::with([
            'employee',
            'items.salaryComponent'
        ])
        ->when($request->filled('employee_id'), function ($q) use ($request) {
            $q->where('employee_id', $request->employee_id);
        })
        ->when($request->filled('month'), function ($q) use ($request) {
            $q->where('month', $request->month);
        })
        ->when($request->filled('year'), function ($q) use ($request) {
            $q->where('year', $request->year);
        })
        ->when($request->filled('status'), function ($q) use ($request) {
            $q->where('status', $request->status);
        })
        ->when($request->filled('department_id'), function ($q) use ($request) {
            $q->whereHas('employee', function ($emp) use ($request) {
                $emp->where('department_id', $request->department_id);
            });
        })
        ->when($request->filled('search'), function ($q) use ($request) {
            $search = $request->search;

            $q->whereHas('employee', function ($emp) use ($search) {
                $emp->where('full_name', 'like', "%{$search}%");
            });
        });

        $this->scopeToOwnDataIfEmployee($query, $request);
        $this->restrictToPublishedIfEmployee($query, $request);

        $query->latest();

        $payslips = $query->paginate($request->integer('per_page', 10));

        return response()->json([
            'success' => true,
            'message' => 'Data slip gaji berhasil diambil.',
            'total'   => $payslips->total(),
            'data'    => $payslips->items(),
            'pagination' => [
                'current_page' => $payslips->currentPage(),
                'per_page' => $payslips->perPage(),
                'last_page' => $payslips->lastPage(),
            ]
        ]);
    }

    /**
     * Rekap payroll untuk satu periode (bulan/tahun).
     *
     * Menampilkan ringkasan: total slip gaji, total nominal per status
     * (Draft/Published), dan berapa karyawan aktif yang BELUM punya
     * payslip di periode itu (supaya HRD tahu siapa yang belum diproses).
     */
    public function summary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2024',
        ]);

        $payslips = Payslip::with('employee:id,full_name,employee_code,department_id')
            ->where('month', $validated['month'])
            ->where('year', $validated['year'])
            ->get();

        $draft = $payslips->where('status', 'Draft');
        $published = $payslips->where('status', 'Published');

        $activeEmployeeIds = Employee::where('is_active', true)->pluck('id');

        $employeesWithoutPayslip = $activeEmployeeIds
            ->diff($payslips->pluck('employee_id'))
            ->count();

        return response()->json([
            'success' => true,
            'message' => 'Rekap payroll berhasil diambil.',
            'period' => [
                'month' => (int) $validated['month'],
                'year' => (int) $validated['year'],
            ],
            'summary' => [
                'total_payslips' => $payslips->count(),
                'total_net_salary' => $payslips->sum('net_salary'),
                'draft' => [
                    'count' => $draft->count(),
                    'total_net_salary' => $draft->sum('net_salary'),
                ],
                'published' => [
                    'count' => $published->count(),
                    'total_net_salary' => $published->sum('net_salary'),
                ],
                'active_employees_without_payslip' => $employeesWithoutPayslip,
            ],
            'data' => $payslips->values(),
        ]);
    }

    /**
     * Generate payslip untuk SEMUA karyawan aktif sekaligus dalam satu periode.
     *
     * Cuma pakai komponen gaji yang wajib (is_required=true) sebagai baseline -
     * BASIC pakai basic_salary masing-masing karyawan, komponen wajib lain
     * (kalau ada) pakai default_amount. Komponen opsional (bonus, lembur, dll)
     * TIDAK ikut otomatis - HRD tambahkan manual per karyawan sesudahnya lewat
     * update payslip biasa, karena tiap bulan kebijakannya bisa beda-beda.
     *
     * Karyawan yang sudah punya payslip di periode itu otomatis dilewati
     * (tidak dibuat dobel).
     */
    public function generateBulk(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2024',
        ]);

        $requiredComponents = SalaryComponent::where('is_required', true)
            ->where('is_active', true)
            ->get();

        if ($requiredComponents->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada komponen gaji wajib (is_required) yang aktif. Set dulu komponen wajib sebelum generate payroll massal.'
            ], 422);
        }

        $period = PayrollPeriod::findOrCreateRegular(
            $validated['month'],
            $validated['year'],
            $request->user()->id
        );

        $existingEmployeeIds = Payslip::where('payroll_period_id', $period->id)
            ->pluck('employee_id')
            ->flip(); // flip -> key lookup O(1), bukan ->contains() O(n) di dalam loop

        $created = [];
        $skipped = [];

        try {

            // Chunking - biar gak nge-load ribuan employee sekaligus ke memory,
            // dan gak nahan 1 transaksi raksasa buat semua data. Tiap chunk
            // 200 karyawan punya transaksi sendiri.
            Employee::where('is_active', true)->chunkById(200, function ($employees) use (
                $requiredComponents,
                $period,
                $validated,
                $existingEmployeeIds,
                &$created,
                &$skipped
            ) {

                DB::beginTransaction();

                try {

                    foreach ($employees as $employee) {

                        if ($existingEmployeeIds->has($employee->id)) {
                            $skipped[] = $employee->id;
                            continue;
                        }

                        $payslip = Payslip::create([
                            'payroll_period_id'  => $period->id,
                            'employee_id'        => $employee->id,
                            'department_id'       => $employee->department_id,
                            'office_location_id'  => $employee->office_location_id,
                            'month'               => $validated['month'],
                            'year'                => $validated['year'],
                            'status'              => 'Draft',
                            'gross_earning'       => 0,
                            'total_deduction'     => 0,
                            'net_salary'          => 0,
                        ]);

                        $grossEarning = 0;
                        $totalDeduction = 0;
                        $itemRows = [];
                        $now = now();

                        foreach ($requiredComponents as $index => $component) {

                            $amount = $component->code === 'BASIC'
                                ? $employee->basic_salary
                                : $component->default_amount;

                            $itemRows[] = [
                                'payslip_id' => $payslip->id,
                                'salary_component_id' => $component->id,
                                'component_code' => $component->code,
                                'component_name' => $component->name,
                                'component_type' => $component->type,
                                'amount' => $amount,
                                'notes' => 'Auto-generated (payroll massal)',
                                'sort_order' => $index + 1,
                                'created_at' => $now,
                                'updated_at' => $now,
                            ];

                            if ($component->type === 'earning') {
                                $grossEarning += $amount;
                            } else {
                                $totalDeduction += $amount;
                            }
                        }

                        // Bulk insert semua item sekaligus (1 query per payslip,
                        // bukan 1 query per komponen) - ini yang paling nolong
                        // waktu komponen wajibnya banyak.
                        PayslipItem::insert($itemRows);

                        $payslip->update([
                            'gross_earning' => $grossEarning,
                            'total_deduction' => $totalDeduction,
                            'net_salary' => $grossEarning - $totalDeduction,
                        ]);

                        $created[] = $payslip->id;
                    }

                    DB::commit();

                } catch (Exception $e) {

                    DB::rollBack();

                    throw $e;
                }
            });

        } catch (Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'Gagal generate payroll massal.',
                'error' => $e->getMessage(),
                'note' => 'Sebagian chunk mungkin sudah ter-commit sebelum error terjadi (tiap 200 karyawan punya transaksi sendiri) - cek total_created di percobaan berikutnya sebelum retry.',
                'total_created_before_error' => count($created),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Payroll massal berhasil digenerate.',
            'period' => [
                'id' => $period->id,
                'period_code' => $period->period_code,
                'month' => (int) $validated['month'],
                'year' => (int) $validated['year'],
            ],
            'total_created' => count($created),
            'total_skipped' => count($skipped),
            'created_payslip_ids' => $created,
            'skipped_employee_ids' => $skipped,
        ], 201);
    }

    /**
     * Publish SEMUA payslip berstatus Draft dalam satu periode sekaligus.
     * Dipakai setelah HRD selesai review & lengkapi komponen tambahan
     * (bonus, lembur, dll) satu-satu lewat update payslip biasa.
     */
    public function publishBulk(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2024',
        ]);

        $draftPayslipIds = Payslip::where('month', $validated['month'])
            ->where('year', $validated['year'])
            ->where('status', 'Draft')
            ->pluck('id');

        if ($draftPayslipIds->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada payslip berstatus Draft di periode ini untuk dipublish.'
            ], 422);
        }

        $published = [];
        $failed = [];

        // Chunk 100 per transaksi - konsisten sama prinsip generateBulk,
        // biar 1 periode besar gak jadi satu transaksi raksasa yang
        // nahan lock kelamaan.
        foreach ($draftPayslipIds->chunk(100) as $chunkIds) {

            try {

                DB::transaction(function () use ($chunkIds, $request, &$published) {

                    $payslips = Payslip::whereIn('id', $chunkIds)->get();

                    foreach ($payslips as $payslip) {

                        $payslip->update([
                            'status' => 'Published',
                            'published_by' => $request->user()->id,
                            'published_at' => now(),
                            'unpublish_reason' => null,
                        ]);

                        $payslip->load(['employee', 'department', 'officeLocation', 'items']);
                        $payslip->file_pdf = $this->generateAndStorePayslipPdf($payslip);
                        $payslip->saveQuietly();

                        AuditLogService::log(
                            $payslip,
                            'published',
                            ['status' => 'Draft'],
                            ['status' => 'Published'],
                            $request->user()->id,
                            'Publish slip gaji (massal)'
                        );

                        Notification::notify(
                            $payslip->employee_id,
                            'payslip_published',
                            'Slip Gaji Tersedia',
                            "Slip gaji periode {$payslip->month}/{$payslip->year} sudah bisa dilihat.",
                            ['payslip_id' => $payslip->id]
                        );

                        $published[] = $payslip->id;
                    }
                });

            } catch (Exception $e) {

                // Chunk ini gagal & rollback total - chunk lain yang SUDAH
                // ter-commit sebelumnya tetap aman (masing-masing transaksi
                // independen). ID yang gagal dicatat biar bisa di-retry.
                $failed = array_merge($failed, $chunkIds->all());
            }
        }

        return response()->json([
            'success' => empty($failed),
            'message' => empty($failed)
                ? 'Payroll massal berhasil dipublish.'
                : 'Sebagian payslip gagal dipublish, cek published_payslip_ids vs failed_payslip_ids.',
            'period' => [
                'month' => (int) $validated['month'],
                'year' => (int) $validated['year'],
            ],
            'total_published' => count($published),
            'total_failed' => count($failed),
            'published_payslip_ids' => $published,
            'failed_payslip_ids' => $failed,
        ], empty($failed) ? 200 : 207);
    }

    /**
     * Store new payslip.
     */
    public function store(StorePayslipRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Cari/bikin PayrollPeriod REGULAR otomatis dari month+year -
        // request body TIDAK berubah, klien lama tetap kirim month+year
        // seperti biasa, period-nya ditangani di belakang layar.
        $period = PayrollPeriod::findOrCreateRegular(
            $validated['month'],
            $validated['year'],
            $request->user()->id
        );

        if (Payslip::where('payroll_period_id', $period->id)
            ->where('employee_id', $validated['employee_id'])
            ->exists()
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Slip gaji pada periode tersebut sudah ada.'
            ], 409);
        }

        $employee = Employee::findOrFail($validated['employee_id']);

        DB::beginTransaction();

        try {

            $payslip = Payslip::create([

                'payroll_period_id'  => $period->id,
                'employee_id'        => $validated['employee_id'],
                // Snapshot - departemen/kantor karyawan SAAT slip ini dibuat
                'department_id'      => $employee->department_id,
                'office_location_id' => $employee->office_location_id,
                'month'              => $validated['month'],
                'year'               => $validated['year'],
                'status'             => 'Draft',
                'file_pdf'           => $validated['file_pdf'] ?? null,
                'gross_earning'      => 0,
                'total_deduction'    => 0,
                'net_salary'         => 0,

            ]);

            $grossEarning = 0;
            $totalDeduction = 0;

            foreach ($validated['items'] as $index => $item) {

                $component = SalaryComponent::select(
                    'id',
                    'code',
                    'name',
                    'type'
                )->findOrFail($item['salary_component_id']);

                PayslipItem::create([

                    'payslip_id'          => $payslip->id,
                    'salary_component_id' => $component->id,
                    // Snapshot - nama/kode/tipe komponen SAAT item ini dibuat.
                    // Kalau nanti HRD rename/ubah komponennya, slip ini tetap
                    // menampilkan yang aslinya.
                    'component_code'      => $component->code,
                    'component_name'      => $component->name,
                    'component_type'      => $component->type,
                    'amount'              => $item['amount'],
                    'notes'               => $item['notes'] ?? null,
                    'sort_order'          => $index + 1,

                ]);

                if ($component->type === 'earning') {
                    $grossEarning += $item['amount'];
                } else {
                    $totalDeduction += $item['amount'];
                }
            }

            $payslip->update([
                'gross_earning' => $grossEarning,
                'total_deduction' => $totalDeduction,
                'net_salary' => $grossEarning - $totalDeduction,
            ]);

            DB::commit();

            AuditLogService::log(
                $payslip,
                'created',
                null,
                $payslip->only(['employee_id', 'payroll_period_id', 'month', 'year', 'net_salary']),
                $request->user()->id,
                'Slip gaji baru dibuat'
            );

            return response()->json([
                'success' => true,
                'message' => 'Slip gaji berhasil dibuat.',
                'data'    => $payslip->load([
                    'employee',
                    'payrollPeriod',
                    'items.salaryComponent'
                ])
            ], 201);

        } catch (Exception $e) {

            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat slip gaji.',
                'error'   => $e->getMessage()
            ], 500);

        }
    }

    /**
     * Show detail payslip.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $payslip = Payslip::with([
            'employee',
            'items.salaryComponent'
        ])->findOrFail($id);

        $this->ensureOwnDataOrAdmin($request, $payslip->employee_id);
        $this->ensurePublishedOrAdmin($request, $payslip->status);

        return response()->json([
            'success' => true,
            'message' => 'Detail slip gaji berhasil diambil.',
            'data'    => $payslip
        ]);
    }

    /**
     * Update payslip.
     *
     * Slip gaji yang sudah Published tidak boleh diubah lagi - untuk
     * koreksi setelah publish, harus lewat proses resmi (revisi/void),
     * bukan edit diam-diam.
     */
    public function update(UpdatePayslipRequest $request, string $id): JsonResponse
    {
        $payslip = Payslip::findOrFail($id);

        if ($payslip->status === 'Published') {
            return response()->json([
                'success' => false,
                'message' => 'Slip gaji yang sudah dipublish tidak bisa diubah lagi.'
            ], 422);
        }

        $validated = $request->validated();

        $oldValues = $payslip->only(['employee_id', 'month', 'year', 'net_salary']);

        DB::beginTransaction();

        try {

            $payslip->update([

                'month'       => $validated['month'] ?? $payslip->month,
                'year'        => $validated['year'] ?? $payslip->year,
                'file_pdf'    => $validated['file_pdf'] ?? $payslip->file_pdf,

            ]);

            if (isset($validated['items'])) {

                $payslip->items()->delete();

                $grossEarning = 0;
                $totalDeduction = 0;
                $itemRows = [];
                $now = now();

                foreach ($validated['items'] as $index => $item) {

                    $component = SalaryComponent::select(
                        'id',
                        'code',
                        'name',
                        'type'
                    )->findOrFail($item['salary_component_id']);

                    $itemRows[] = [
                        'payslip_id'          => $payslip->id,
                        'salary_component_id' => $component->id,
                        'component_code'      => $component->code,
                        'component_name'      => $component->name,
                        'component_type'      => $component->type,
                        'amount'              => $item['amount'],
                        'notes'               => $item['notes'] ?? null,
                        'sort_order'          => $index + 1,
                        'created_at'          => $now,
                        'updated_at'          => $now,
                    ];

                    if ($component->type === 'earning') {
                        $grossEarning += $item['amount'];
                    } else {
                        $totalDeduction += $item['amount'];
                    }
                }

                PayslipItem::insert($itemRows);

                $payslip->update([
                    'gross_earning' => $grossEarning,
                    'total_deduction' => $totalDeduction,
                    'net_salary' => $grossEarning - $totalDeduction,
                ]);
            }

            DB::commit();

            AuditLogService::log(
                $payslip,
                'updated',
                $oldValues,
                $payslip->fresh()->only(['employee_id', 'month', 'year', 'net_salary']),
                $request->user()->id,
                'Update slip gaji'
            );

            return response()->json([
                'success' => true,
                'message' => 'Slip gaji berhasil diperbarui.',
                'data'    => $payslip->fresh()->load([
                    'employee',
                    'items.salaryComponent'
                ])
            ]);

        } catch (Exception $e) {

            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Gagal memperbarui slip gaji.',
                'error'   => $e->getMessage()
            ], 500);

        }
    }

    /**
     * Delete payslip.
     * Slip gaji yang sudah Published tidak boleh dihapus (jaga integritas data finansial).
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $payslip = Payslip::findOrFail($id);

        if ($payslip->status === 'Published') {
            return response()->json([
                'success' => false,
                'message' => 'Slip gaji yang sudah dipublish tidak bisa dihapus. Unpublish dulu jika benar-benar perlu dihapus.'
            ], 422);
        }

        $oldValues = $payslip->only(['employee_id', 'month', 'year', 'net_salary', 'status']);

        $payslip->delete();

        AuditLogService::log(
            $payslip,
            'deleted',
            $oldValues,
            null,
            $request->user()->id,
            'Hapus slip gaji'
        );

        return response()->json([
            'success' => true,
            'message' => 'Slip gaji berhasil dihapus.'
        ]);
    }

    /**
     * Publish payslip - menandai slip gaji sudah final dan bisa dilihat karyawan.
     * Setelah ini, payslip terkunci dari edit/hapus sampai di-unpublish.
     */
    public function publish(Request $request, string $id): JsonResponse
    {
        $payslip = Payslip::findOrFail($id);

        if ($payslip->status === 'Published') {
            return response()->json([
                'success' => false,
                'message' => 'Slip gaji ini sudah dipublish sebelumnya.'
            ], 422);
        }

        try {

            DB::transaction(function () use ($payslip, $request) {

                $payslip->update([
                    'status' => 'Published',
                    'published_by' => $request->user()->id,
                    'published_at' => now(),
                    'unpublish_reason' => null,
                ]);

                // Bekukan PDF-nya SEKARANG, saat data masih benar & final -
                // ini yang jadi arsip permanen. Kalau langkah ini gagal
                // (storage penuh, dompdf error, dll), seluruh transaksi di
                // atas ikut rollback - status TIDAK akan kepublish sendirian
                // tanpa PDF-nya.
                $payslip->load(['employee', 'department', 'officeLocation', 'items']);
                $payslip->file_pdf = $this->generateAndStorePayslipPdf($payslip);
                $payslip->saveQuietly();

                AuditLogService::log(
                    $payslip,
                    'published',
                    ['status' => 'Draft'],
                    ['status' => 'Published'],
                    $request->user()->id,
                    'Publish slip gaji'
                );

                Notification::notify(
                    $payslip->employee_id,
                    'payslip_published',
                    'Slip Gaji Tersedia',
                    "Slip gaji periode {$payslip->month}/{$payslip->year} sudah bisa dilihat.",
                    ['payslip_id' => $payslip->id]
                );
            });

        } catch (Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'Gagal publish slip gaji. Semua perubahan sudah dibatalkan (rollback), status tetap Draft.',
                'error' => $e->getMessage()
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Slip gaji berhasil dipublish.',
            'data' => $payslip->refresh()->load([
                'employee',
                'publisher',
                'items.salaryComponent'
            ])
        ]);
    }

    /**
     * Unpublish payslip - membuka kunci lagi untuk keperluan revisi resmi.
     * Wajib menyertakan alasan supaya tetap ada jejak kenapa dibuka kembali.
     */
    public function unpublish(Request $request, string $id): JsonResponse
    {
        $payslip = Payslip::findOrFail($id);

        if ($payslip->status !== 'Published') {
            return response()->json([
                'success' => false,
                'message' => 'Slip gaji ini belum dipublish, tidak perlu di-unpublish.'
            ], 422);
        }

        $validated = $request->validate([
            'unpublish_reason' => 'required|string|max:1000',
        ], [
            'unpublish_reason.required' => 'Alasan unpublish wajib diisi.',
        ]);

        $previousPdfPath = $payslip->file_pdf;

        try {

            DB::transaction(function () use ($payslip, $request, $validated, $previousPdfPath) {

                $payslip->update([
                    'status' => 'Draft',
                    'unpublish_reason' => $validated['unpublish_reason'],
                    'file_pdf' => null, // publish berikutnya bikin arsip baru - file LAMA tetap ada di disk sebagai jejak historis, tidak dihapus
                ]);

                AuditLogService::log(
                    $payslip,
                    'unpublished',
                    ['status' => 'Published', 'file_pdf' => $previousPdfPath],
                    ['status' => 'Draft', 'unpublish_reason' => $validated['unpublish_reason']],
                    $request->user()->id,
                    'Unpublish slip gaji'
                );

                Notification::notify(
                    $payslip->employee_id,
                    'payslip_unpublished',
                    'Slip Gaji Direvisi',
                    "Slip gaji periode {$payslip->month}/{$payslip->year} sedang direvisi HRD. Alasan: {$validated['unpublish_reason']}",
                    ['payslip_id' => $payslip->id]
                );
            });

        } catch (Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'Gagal unpublish slip gaji. Semua perubahan sudah dibatalkan (rollback).',
                'error' => $e->getMessage()
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Slip gaji berhasil di-unpublish, sekarang bisa direvisi.',
            'data' => $payslip->refresh()->load([
                'employee',
                'publisher',
                'items.salaryComponent'
            ])
        ]);
    }
}