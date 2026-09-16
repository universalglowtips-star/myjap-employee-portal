<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollPeriod;
use App\Models\PayrollPeriodEmployeeQuantity;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Task 15b - "Isi Data Periode": HRD isi Jumlah (Hari Kerja/Jumlah Resi
 * dst) per karyawan per komponen scheduled_variable SEBELUM generateBulk().
 * Batch upsert (BUKAN per-baris seperti EmployeeOfficeScope/
 * SalaryComponentPosition) - HRD ngisi tabel besar (~N karyawan x
 * beberapa komponen) sekaligus lalu klik Simpan 1x, bukan submit per sel.
 */
class PayrollPeriodQuantityController extends Controller
{
    public function index(string $payrollPeriodId): JsonResponse
    {
        $period = PayrollPeriod::findOrFail($payrollPeriodId);

        $quantities = $period->employeeQuantities()->with(['employee', 'salaryComponent'])->get();

        return response()->json([
            'success' => true,
            'message' => 'Data jumlah periode berhasil diambil.',
            'data' => $quantities,
        ]);
    }

    /**
     * Batch upsert. Cuma bisa selagi periode masih Draft (belum submit
     * approval) - guard SAMA PERSIS PayslipController::update() (Task
     * 15b bagian D), konsisten: begitu periode disubmit, seluruh data
     * generate (termasuk Jumlah ini) dianggap final sampai di-reject
     * balik ke Draft.
     */
    public function update(Request $request, string $payrollPeriodId): JsonResponse
    {
        $period = PayrollPeriod::findOrFail($payrollPeriodId);

        if ($period->status !== 'Draft') {
            return response()->json([
                'success' => false,
                'message' => "Periode ini statusnya '{$period->status}' - Jumlah cuma bisa diisi/diubah selagi periode masih Draft.",
            ], 422);
        }

        $validated = $request->validate([
            'quantities' => 'required|array|min:1',
            'quantities.*.employee_id' => 'required|exists:employees,id',
            'quantities.*.salary_component_id' => 'required|exists:salary_components,id',
            'quantities.*.quantity' => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($period, $validated) {

            foreach ($validated['quantities'] as $row) {

                PayrollPeriodEmployeeQuantity::updateOrCreate(
                    [
                        'payroll_period_id' => $period->id,
                        'employee_id' => $row['employee_id'],
                        'salary_component_id' => $row['salary_component_id'],
                    ],
                    [
                        'quantity' => $row['quantity'],
                    ]
                );
            }
        });

        AuditLogService::log(
            $period,
            'quantities_updated',
            null,
            ['rows_count' => count($validated['quantities'])],
            $request->user()->id,
            "Isi/update Jumlah periode untuk {$period->period_code}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Data jumlah periode berhasil disimpan.',
            'data' => $period->employeeQuantities()->with(['employee', 'salaryComponent'])->get(),
        ]);
    }
}
