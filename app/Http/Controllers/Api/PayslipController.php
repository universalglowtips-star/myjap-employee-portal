<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePayslipRequest;
use App\Http\Requests\UpdatePayslipRequest;

use App\Models\Employee;
use App\Models\Payslip;
use App\Models\PayslipItem;
use App\Models\SalaryComponent;
use App\Models\CompanySetting;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
use Exception;

class PayslipController extends Controller
{
    /**
     * Generate & download PDF slip gaji.
     */
    public function pdf(string $id)
    {
        $payslip = Payslip::with([
            'employee',
            'items.salaryComponent'
        ])->findOrFail($id);

        $pdf = Pdf::loadView('pdf.payslip', [
            'payslip' => $payslip,
            'company' => CompanySetting::current(),
        ])->setPaper('a4', 'portrait');

        $filename = sprintf(
            'Slip-Gaji-%s-%02d-%d.pdf',
            str_replace(' ', '-', $payslip->employee->full_name),
            $payslip->month,
            $payslip->year
        );

        return $pdf->download($filename);
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
        })
        ->latest();

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

        $employees = Employee::where('is_active', true)->get();

        $existingEmployeeIds = Payslip::where('month', $validated['month'])
            ->where('year', $validated['year'])
            ->pluck('employee_id');

        $created = [];
        $skipped = [];

        DB::beginTransaction();

        try {

            foreach ($employees as $employee) {

                if ($existingEmployeeIds->contains($employee->id)) {
                    $skipped[] = $employee->id;
                    continue;
                }

                $payslip = Payslip::create([
                    'employee_id' => $employee->id,
                    'month' => $validated['month'],
                    'year' => $validated['year'],
                    'status' => 'Draft',
                    'net_salary' => 0,
                ]);

                $netSalary = 0;

                foreach ($requiredComponents as $index => $component) {

                    $amount = $component->code === 'BASIC'
                        ? $employee->basic_salary
                        : $component->default_amount;

                    PayslipItem::create([
                        'payslip_id' => $payslip->id,
                        'salary_component_id' => $component->id,
                        'amount' => $amount,
                        'notes' => 'Auto-generated (payroll massal)',
                        'sort_order' => $index + 1,
                    ]);

                    $netSalary += $component->type === 'earning' ? $amount : -$amount;
                }

                $payslip->update(['net_salary' => $netSalary]);

                $created[] = $payslip->id;
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payroll massal berhasil digenerate.',
                'period' => [
                    'month' => (int) $validated['month'],
                    'year' => (int) $validated['year'],
                ],
                'total_created' => count($created),
                'total_skipped' => count($skipped),
                'created_payslip_ids' => $created,
                'skipped_employee_ids' => $skipped,
            ], 201);

        } catch (Exception $e) {

            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Gagal generate payroll massal.',
                'error' => $e->getMessage()
            ], 500);

        }
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

        $draftPayslips = Payslip::where('month', $validated['month'])
            ->where('year', $validated['year'])
            ->where('status', 'Draft')
            ->get();

        if ($draftPayslips->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada payslip berstatus Draft di periode ini untuk dipublish.'
            ], 422);
        }

        foreach ($draftPayslips as $payslip) {
            $payslip->update([
                'status' => 'Published',
                'published_by' => $request->user()->id,
                'published_at' => now(),
                'unpublish_reason' => null,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Payroll massal berhasil dipublish.',
            'period' => [
                'month' => (int) $validated['month'],
                'year' => (int) $validated['year'],
            ],
            'total_published' => $draftPayslips->count(),
        ]);
    }

    /**
     * Store new payslip.
     */
    public function store(StorePayslipRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (
            Payslip::where('employee_id', $validated['employee_id'])
                ->where('month', $validated['month'])
                ->where('year', $validated['year'])
                ->exists()
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Slip gaji pada periode tersebut sudah ada.'
            ], 409);
        }

        DB::beginTransaction();

        try {

            $payslip = Payslip::create([

                'employee_id' => $validated['employee_id'],
                'month'       => $validated['month'],
                'year'        => $validated['year'],
                'status'      => 'Draft',
                'file_pdf'    => $validated['file_pdf'] ?? null,
                'net_salary'  => 0,

            ]);

            $netSalary = 0;

            foreach ($validated['items'] as $index => $item) {

                $component = SalaryComponent::select(
                    'id',
                    'type'
                )->findOrFail($item['salary_component_id']);

                PayslipItem::create([

                    'payslip_id'          => $payslip->id,
                    'salary_component_id' => $component->id,
                    'amount'              => $item['amount'],
                    'notes'               => $item['notes'] ?? null,
                    'sort_order'          => $index + 1,

                ]);

                if ($component->type === 'earning') {

                    $netSalary += $item['amount'];

                } else {

                    $netSalary -= $item['amount'];

                }
            }

            $payslip->update([
                'net_salary' => $netSalary
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Slip gaji berhasil dibuat.',
                'data'    => $payslip->load([
                    'employee',
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
    public function show(string $id): JsonResponse
    {
        $payslip = Payslip::with([
            'employee',
            'items.salaryComponent'
        ])->findOrFail($id);

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

        DB::beginTransaction();

        try {

            $payslip->update([

                'employee_id' => $validated['employee_id'] ?? $payslip->employee_id,
                'month'       => $validated['month'] ?? $payslip->month,
                'year'        => $validated['year'] ?? $payslip->year,
                'file_pdf'    => $validated['file_pdf'] ?? $payslip->file_pdf,

            ]);

            if (isset($validated['items'])) {

                $payslip->items()->delete();

                $netSalary = 0;

                foreach ($validated['items'] as $index => $item) {

                    $component = SalaryComponent::select(
                        'id',
                        'type'
                    )->findOrFail($item['salary_component_id']);

                    PayslipItem::create([

                        'payslip_id'          => $payslip->id,
                        'salary_component_id' => $component->id,
                        'amount'              => $item['amount'],
                        'notes'               => $item['notes'] ?? null,
                        'sort_order'          => $index + 1,

                    ]);

                    if ($component->type === 'earning') {

                        $netSalary += $item['amount'];

                    } else {

                        $netSalary -= $item['amount'];

                    }
                }

                $payslip->update([
                    'net_salary' => $netSalary
                ]);
            }

            DB::commit();

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
    public function destroy(string $id): JsonResponse
    {
        $payslip = Payslip::findOrFail($id);

        if ($payslip->status === 'Published') {
            return response()->json([
                'success' => false,
                'message' => 'Slip gaji yang sudah dipublish tidak bisa dihapus. Unpublish dulu jika benar-benar perlu dihapus.'
            ], 422);
        }

        $payslip->delete();

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

        $payslip->update([
            'status' => 'Published',
            'published_by' => $request->user()->id,
            'published_at' => now(),
            'unpublish_reason' => null,
        ]);

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

        $payslip->update([
            'status' => 'Draft',
            'unpublish_reason' => $validated['unpublish_reason'],
        ]);

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