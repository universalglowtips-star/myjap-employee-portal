<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SalaryComponent;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalaryComponentController extends Controller
{
    /**
     * Dynamic Payroll Component - HRD bebas nambah/ubah/nonaktifkan
     * komponen gaji kapan saja TANPA migration/perubahan kode, sesuai
     * prinsip yang sudah disepakati sejak Tahap 0. Controller ini
     * cuma exposed CRUD-nya lewat API (sebelumnya dikelola manual
     * lewat tinker/seeder selama masa development).
     */
    public function index(Request $request): JsonResponse
    {
        $components = SalaryComponent::query()
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->type))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Data komponen gaji berhasil diambil.',
            'total' => $components->count(),
            'data' => $components,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $component = SalaryComponent::findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail komponen gaji berhasil diambil.',
            'data' => $component,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:20|unique:salary_components,code',
            'name' => 'required|string|max:100',
            'type' => 'required|in:earning,deduction',
            'default_amount' => 'nullable|numeric|min:0',
            'is_taxable' => 'boolean',
            'is_required' => 'boolean',
            'is_active' => 'boolean',
            'description' => 'nullable|string',
        ]);

        $component = SalaryComponent::create($validated);

        AuditLogService::log(
            $component,
            'created',
            null,
            $component->only(['code', 'name', 'type', 'is_required']),
            $request->user()->id,
            'Komponen gaji baru dibuat'
        );

        return response()->json([
            'success' => true,
            'message' => 'Komponen gaji berhasil dibuat.',
            'data' => $component,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $component = SalaryComponent::findOrFail($id);

        $validated = $request->validate([
            'code' => 'sometimes|string|max:20|unique:salary_components,code,' . $component->id,
            'name' => 'sometimes|string|max:100',
            'type' => 'sometimes|in:earning,deduction',
            'default_amount' => 'nullable|numeric|min:0',
            'is_taxable' => 'boolean',
            'is_required' => 'boolean',
            'is_active' => 'boolean',
            'description' => 'nullable|string',
        ]);

        $oldValues = $component->only(['code', 'name', 'type', 'is_required', 'is_active']);

        $component->update($validated);

        AuditLogService::log(
            $component,
            'updated',
            $oldValues,
            $component->only(['code', 'name', 'type', 'is_required', 'is_active']),
            $request->user()->id,
            'Update komponen gaji'
        );

        return response()->json([
            'success' => true,
            'message' => 'Komponen gaji berhasil diperbarui.',
            'data' => $component->fresh(),
        ]);
    }

    /**
     * Soft delete - komponen yang PERNAH dipakai di payslip histori
     * TIDAK terpengaruh sama sekali, karena payslip_items sudah punya
     * snapshot (component_code/name/type) sendiri sejak Tahap 0.
     * Nonaktifkan (is_active=false) lebih disarankan daripada hapus,
     * tapi delete tetap disediakan untuk komponen yang salah input.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $component = SalaryComponent::findOrFail($id);

        $oldValues = $component->only(['code', 'name']);

        $component->delete();

        AuditLogService::log(
            $component,
            'deleted',
            $oldValues,
            null,
            $request->user()->id,
            'Hapus komponen gaji'
        );

        return response()->json([
            'success' => true,
            'message' => 'Komponen gaji berhasil dihapus.',
        ]);
    }
}
