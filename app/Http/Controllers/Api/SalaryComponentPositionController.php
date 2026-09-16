<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PositionSalaryComponent;
use App\Models\SalaryComponent;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Task 15b - CRUD "jabatan mana aja yang dapat komponen ini + berapa
 * nominal/tarif default-nya", dari sisi Komponen Gaji (bukan dari sisi
 * Posisi) - keputusan UX: category (fixed/scheduled_variable/situational)
 * hidup di SalaryComponent, jadi mengelola "jabatan yang berlaku" di
 * tempat yang sama menjaga satu komponen tetap 1 layar konfigurasi utuh.
 * Pola CRUD per-baris (bukan replace-all) sama persis
 * EmployeeOfficeScopeController (Task 8e) sesuai instruksi.
 */
class SalaryComponentPositionController extends Controller
{
    public function index(string $salaryComponentId): JsonResponse
    {
        $component = SalaryComponent::findOrFail($salaryComponentId);

        $rates = $component->positionRates()->with('position')->get();

        return response()->json([
            'success' => true,
            'message' => 'Data jabatan untuk komponen gaji ini berhasil diambil.',
            'data' => $rates,
        ]);
    }

    /**
     * Upsert (BEDA dari EmployeeOfficeScope::store() yang menolak
     * duplikat) - nominal/tarif per jabatan WAJAR berubah dari waktu ke
     * waktu, jadi submit ulang buat jabatan yang sudah ada di-treat
     * sebagai UPDATE nominalnya, bukan error.
     */
    public function store(Request $request, string $salaryComponentId): JsonResponse
    {
        $component = SalaryComponent::findOrFail($salaryComponentId);

        $validated = $request->validate([
            'position_id' => 'required|exists:positions,id',
            'amount' => 'required|numeric|min:0',
        ]);

        $rate = PositionSalaryComponent::updateOrCreate(
            [
                'salary_component_id' => $component->id,
                'position_id' => $validated['position_id'],
            ],
            [
                'amount' => $validated['amount'],
            ]
        );

        AuditLogService::log(
            $rate,
            'created',
            null,
            $rate->only(['position_id', 'salary_component_id', 'amount']),
            $request->user()->id,
            "Set nominal/tarif komponen gaji {$component->name} untuk jabatan tertentu"
        );

        return response()->json([
            'success' => true,
            'message' => 'Nominal/tarif jabatan berhasil disimpan.',
            'data' => $rate->load('position'),
        ], 201);
    }

    public function destroy(Request $request, string $salaryComponentId, string $positionId): JsonResponse
    {
        $component = SalaryComponent::findOrFail($salaryComponentId);

        $rate = $component->positionRates()->where('position_id', $positionId)->first();

        if (! $rate) {
            return response()->json([
                'success' => false,
                'message' => 'Jabatan ini belum punya pengaturan untuk komponen gaji tersebut.',
            ], 404);
        }

        $oldValues = $rate->only(['position_id', 'salary_component_id', 'amount']);

        $rate->delete();

        AuditLogService::log(
            $rate,
            'deleted',
            $oldValues,
            null,
            $request->user()->id,
            "Cabut komponen gaji {$component->name} dari jabatan tertentu"
        );

        return response()->json([
            'success' => true,
            'message' => 'Jabatan berhasil dicabut dari komponen gaji ini.',
        ]);
    }
}
