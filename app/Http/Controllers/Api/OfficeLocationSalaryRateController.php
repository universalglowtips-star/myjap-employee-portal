<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeSalaryComponent;
use App\Models\OfficeLocation;
use App\Models\PositionSalaryComponent;
use App\Models\SalaryComponent;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Task 16 - "Atur Tarif per Cabang": HRD pilih 1 cabang, langsung lihat
 * SEMUA karyawan cabang itu x SEMUA komponen gaji fixed/scheduled_variable
 * yang relevan dalam 1 tabel, edit banyak sel sekaligus, simpan 1x.
 * TIDAK ADA tabel baru - murni cara cepat mengisi employee_salary_components
 * (override) yang sudah ada sejak Task 15b, plus employees.basic_salary
 * langsung untuk kolom Gaji Pokok (komponen kode BASIC TIDAK pernah lewat
 * employee_salary_components, lihat PayslipController::resolveComponentRate()).
 *
 * Endpoint ini MELENGKAPI (bukan menggantikan) endpoint per-karyawan
 * EmployeeSalaryComponentController yang tetap dipakai dari halaman Detail
 * Karyawan untuk override satu-satu.
 */
class OfficeLocationSalaryRateController extends Controller
{
    /**
     * Daftar karyawan aktif di 1 cabang + tarif tiap komponen fixed/
     * scheduled_variable yang relevan (override employee_salary_components
     * kalau ada, fallback default position_salary_components, null kalau
     * dua-duanya gak ada baris = komponen ini TIDAK berlaku, bukan Rp 0).
     * Kolom (komponen) yang gak applicable buat SIAPAPUN di cabang ini
     * disembunyikan total dari response - pola sama persis "Isi Data
     * Periode" (PayrollPeriodQuantitiesSection.tsx).
     */
    public function index(string $officeLocationId): JsonResponse
    {
        $officeLocation = OfficeLocation::findOrFail($officeLocationId);

        $employees = Employee::where('office_location_id', $officeLocation->id)
            ->where('is_active', true)
            ->with('position')
            ->orderBy('full_name')
            ->get();

        $components = SalaryComponent::where('is_active', true)
            ->whereIn('category', ['fixed', 'scheduled_variable'])
            ->where('code', '!=', 'BASIC')
            ->get();

        $componentIds = $components->pluck('id');
        $positionIds = $employees->pluck('position_id')->unique();
        $employeeIds = $employees->pluck('id');

        $positionRatesByPosition = PositionSalaryComponent::whereIn('position_id', $positionIds)
            ->whereIn('salary_component_id', $componentIds)
            ->get()
            ->groupBy('position_id');

        $overridesByEmployee = EmployeeSalaryComponent::whereIn('employee_id', $employeeIds)
            ->whereIn('salary_component_id', $componentIds)
            ->get()
            ->groupBy('employee_id');

        $employeeRows = $employees->map(function (Employee $employee) use ($components, $positionRatesByPosition, $overridesByEmployee) {
            $overrides = ($overridesByEmployee->get($employee->id) ?? collect())->keyBy('salary_component_id');
            $positionRates = ($positionRatesByPosition->get($employee->position_id) ?? collect())->keyBy('salary_component_id');

            $rates = [];
            foreach ($components as $component) {
                $override = $overrides->get($component->id);
                $positionRate = $positionRates->get($component->id);

                $rates[$component->id] = [
                    'amount' => $override ? $override->amount : ($positionRate ? $positionRate->amount : null),
                    'is_override' => $override !== null,
                    'applicable' => $override !== null || $positionRate !== null,
                ];
            }

            return [
                'id' => $employee->id,
                'employee_code' => $employee->employee_code,
                'full_name' => $employee->full_name,
                'position_id' => $employee->position_id,
                'position_name' => $employee->position?->position_name,
                'basic_salary' => $employee->basic_salary,
                'rates' => $rates,
            ];
        });

        // Komponen disembunyikan total kalau gak ada satupun karyawan
        // cabang ini yang applicable - bukan tampil penuh kolom "—".
        $relevantComponents = $components
            ->filter(fn (SalaryComponent $component) => $employeeRows->contains(
                fn (array $row) => $row['rates'][$component->id]['applicable']
            ))
            ->values()
            ->map(fn (SalaryComponent $component) => $component->only(['id', 'code', 'name', 'category']));

        return response()->json([
            'success' => true,
            'message' => 'Data tarif komponen gaji per cabang berhasil diambil.',
            'data' => [
                'office_location' => $officeLocation->only(['id', 'office_code', 'office_name']),
                'components' => $relevantComponents->values(),
                'employees' => $employeeRows->values(),
            ],
        ]);
    }

    /**
     * Batch simpan - SATU transaction atomic (pola sama persis
     * PayrollPeriodQuantityController::update()), bukan N request
     * per-sel. 'rates' = override employee_salary_components (amount
     * null berarti CABUT override, karyawan balik ikut default jabatan -
     * BUKAN diset ke Rp 0). 'basic_salaries' = employees.basic_salary
     * langsung, amount WAJIB angka (gak ada konsep "kosongkan biar
     * fallback" untuk Gaji Pokok, kolom ini gak punya tabel default).
     */
    public function update(Request $request, string $officeLocationId): JsonResponse
    {
        $officeLocation = OfficeLocation::findOrFail($officeLocationId);

        $validated = $request->validate([
            'rates' => 'sometimes|array',
            'rates.*.employee_id' => 'required|exists:employees,id',
            'rates.*.salary_component_id' => 'required|exists:salary_components,id',
            'rates.*.amount' => 'nullable|numeric|min:0',
            'basic_salaries' => 'sometimes|array',
            'basic_salaries.*.employee_id' => 'required|exists:employees,id',
            'basic_salaries.*.amount' => 'required|numeric|min:0',
        ]);

        $rates = $validated['rates'] ?? [];
        $basicSalaries = $validated['basic_salaries'] ?? [];

        if (empty($rates) && empty($basicSalaries)) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada perubahan tarif yang dikirim.',
            ], 422);
        }

        // Guard salah kirim (misal state frontend nyangkut cabang lama
        // setelah ganti dropdown) - BUKAN soal wewenang, employee.update
        // sudah global lewat middleware route.
        $employeeIds = collect($rates)->pluck('employee_id')
            ->merge(collect($basicSalaries)->pluck('employee_id'))
            ->unique();

        $mismatched = Employee::whereIn('id', $employeeIds)
            ->where('office_location_id', '!=', $officeLocation->id)
            ->exists();

        if ($mismatched) {
            return response()->json([
                'success' => false,
                'message' => 'Ada karyawan yang dikirim bukan milik cabang ini. Muat ulang halaman lalu coba lagi.',
            ], 422);
        }

        DB::transaction(function () use ($rates, $basicSalaries) {
            foreach ($rates as $row) {
                if ($row['amount'] === null) {
                    EmployeeSalaryComponent::where('employee_id', $row['employee_id'])
                        ->where('salary_component_id', $row['salary_component_id'])
                        ->delete();

                    continue;
                }

                EmployeeSalaryComponent::updateOrCreate(
                    [
                        'employee_id' => $row['employee_id'],
                        'salary_component_id' => $row['salary_component_id'],
                    ],
                    [
                        'amount' => $row['amount'],
                    ]
                );
            }

            foreach ($basicSalaries as $row) {
                Employee::where('id', $row['employee_id'])->update([
                    'basic_salary' => $row['amount'],
                ]);
            }
        });

        AuditLogService::log(
            $officeLocation,
            'salary_rates_updated',
            null,
            ['rates_count' => count($rates), 'basic_salaries_count' => count($basicSalaries)],
            $request->user()->id,
            "Atur tarif komponen gaji per cabang untuk {$officeLocation->office_name}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Tarif komponen gaji berhasil disimpan.',
        ]);
    }
}
