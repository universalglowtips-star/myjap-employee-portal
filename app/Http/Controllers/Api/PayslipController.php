<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePayslipRequest;
use App\Http\Requests\UpdatePayslipRequest;

use App\Models\Payslip;
use App\Models\PayslipItem;
use App\Models\SalaryComponent;

use Illuminate\Http\JsonResponse;
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
                'status'      => $validated['status'] ?? 'Draft',
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
     */
    public function update(UpdatePayslipRequest $request, string $id): JsonResponse
    {
        $validated = $request->validated();

        $payslip = Payslip::findOrFail($id);

        DB::beginTransaction();

        try {

            $payslip->update([

                'employee_id' => $validated['employee_id'] ?? $payslip->employee_id,
                'month'       => $validated['month'] ?? $payslip->month,
                'year'        => $validated['year'] ?? $payslip->year,
                'status'      => $validated['status'] ?? $payslip->status,
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
     */
    public function destroy(string $id): JsonResponse
    {
        $payslip = Payslip::findOrFail($id);

        $payslip->delete();

        return response()->json([
            'success' => true,
            'message' => 'Slip gaji berhasil dihapus.'
        ]);
    }
}