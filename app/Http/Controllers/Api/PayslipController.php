<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePayslipRequest;
use App\Http\Requests\UpdatePayslipRequest;

use App\Models\Payslip;
use App\Models\PayslipItem;
use App\Models\SalaryComponent;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;

class PayslipController extends Controller
{
    /**
     * Display all payslips.
     */
    public function index(): JsonResponse
    {
        $payslips = Payslip::with([
            'employee',
            'items.salaryComponent'
        ])
        ->latest()
        ->get();

        return response()->json([
            'success' => true,
            'message' => 'Data slip gaji berhasil diambil.',
            'total'   => $payslips->count(),
            'data'    => $payslips
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