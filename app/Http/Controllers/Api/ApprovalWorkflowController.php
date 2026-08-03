<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApprovalWorkflow;
use App\Models\ApprovalWorkflowStep;
use App\Models\PayrollPeriod;
use App\Models\Role;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;

class ApprovalWorkflowController extends Controller
{
    /**
     * Role yang boleh dijadikan approver operasional. SUPER_ADMIN
     * SENGAJA tidak dimasukkan - itu cuma buat emergency/maintenance
     * sistem, bukan approver rutin proses bisnis.
     */
    private const ALLOWED_APPROVER_ROLES = ['MANAGER', 'FINANCE', 'HRD'];

    public function index(Request $request): JsonResponse
    {
        $workflows = ApprovalWorkflow::with(['steps.approverRole', 'creator'])
            ->when($request->filled('period_type'), fn ($q) => $q->where('applies_to_period_type', $request->period_type))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Data approval workflow berhasil diambil.',
            'total' => $workflows->count(),
            'data' => $workflows,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $workflow = ApprovalWorkflow::with(['steps.approverRole', 'creator'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail approval workflow berhasil diambil.',
            'data' => $workflow,
        ]);
    }

    /**
     * Bikin workflow baru lengkap dengan step-nya sekaligus. Level
     * harus berurutan mulai dari 1 (1,2,3,...) tanpa lompat/duplikat -
     * ini yang jadi jaminan approval sequential, bukan cuma "asumsi".
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'applies_to_period_type' => 'required|in:REGULAR,THR,BONUS,OFF_CYCLE,CORRECTION',
            'is_active' => 'boolean',
            'steps' => 'required|array|min:1',
            'steps.*.level' => 'required|integer|min:1',
            'steps.*.approver_role_id' => 'required|exists:roles,id',
            'steps.*.restrict_to_office_location' => 'boolean',
        ]);

        $stepError = $this->validateSteps($validated['steps']);

        if ($stepError) {
            return response()->json(['success' => false, 'message' => $stepError], 422);
        }

        DB::beginTransaction();

        try {

            // Kalau workflow ini diaktifkan, nonaktifkan workflow lain
            // yang applies_to period_type sama - cuma 1 yang aktif per
            // period_type di satu waktu.
            if ($validated['is_active'] ?? true) {
                ApprovalWorkflow::where('applies_to_period_type', $validated['applies_to_period_type'])
                    ->where('is_active', true)
                    ->update(['is_active' => false]);
            }

            $workflow = ApprovalWorkflow::create([
                'name' => $validated['name'],
                'applies_to_period_type' => $validated['applies_to_period_type'],
                'is_active' => $validated['is_active'] ?? true,
                'created_by' => $request->user()->id,
            ]);

            foreach ($validated['steps'] as $step) {
                ApprovalWorkflowStep::create([
                    'approval_workflow_id' => $workflow->id,
                    'level' => $step['level'],
                    'approver_role_id' => $step['approver_role_id'],
                    'restrict_to_office_location' => $step['restrict_to_office_location'] ?? false,
                ]);
            }

            DB::commit();

            AuditLogService::log(
                $workflow,
                'created',
                null,
                ['name' => $workflow->name, 'applies_to_period_type' => $workflow->applies_to_period_type, 'steps_count' => count($validated['steps'])],
                $request->user()->id,
                'Approval workflow baru dibuat'
            );

            return response()->json([
                'success' => true,
                'message' => 'Approval workflow berhasil dibuat.',
                'data' => $workflow->load('steps.approverRole'),
            ], 201);

        } catch (Exception $e) {

            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat approval workflow.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $workflow = ApprovalWorkflow::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:150',
            'is_active' => 'sometimes|boolean',
            'steps' => 'sometimes|array|min:1',
            'steps.*.level' => 'required_with:steps|integer|min:1',
            'steps.*.approver_role_id' => 'required_with:steps|exists:roles,id',
            'steps.*.restrict_to_office_location' => 'boolean',
        ]);

        if (isset($validated['steps'])) {

            $stepError = $this->validateSteps($validated['steps']);

            if ($stepError) {
                return response()->json(['success' => false, 'message' => $stepError], 422);
            }
        }

        DB::beginTransaction();

        try {

            if (($validated['is_active'] ?? false) === true) {
                ApprovalWorkflow::where('applies_to_period_type', $workflow->applies_to_period_type)
                    ->where('id', '!=', $workflow->id)
                    ->where('is_active', true)
                    ->update(['is_active' => false]);
            }

            $oldValues = $workflow->only(['name', 'is_active']);

            $workflow->update([
                'name' => $validated['name'] ?? $workflow->name,
                'is_active' => $validated['is_active'] ?? $workflow->is_active,
            ]);

            if (isset($validated['steps'])) {

                // Ganti seluruh step - simpel & aman, workflow yang SEDANG
                // dipakai proses approval berjalan (ada payroll_approvals
                // yang merujuk step lama) tetap aman karena payroll_approvals
                // nyimpen approver_role_id sebagai SNAPSHOT sendiri, gak
                // bergantung ke step yang mungkin sudah diganti/dihapus.
                $workflow->steps()->delete();

                foreach ($validated['steps'] as $step) {
                    ApprovalWorkflowStep::create([
                        'approval_workflow_id' => $workflow->id,
                        'level' => $step['level'],
                        'approver_role_id' => $step['approver_role_id'],
                        'restrict_to_office_location' => $step['restrict_to_office_location'] ?? false,
                    ]);
                }
            }

            DB::commit();

            AuditLogService::log(
                $workflow,
                'updated',
                $oldValues,
                $workflow->only(['name', 'is_active']),
                $request->user()->id,
                'Update approval workflow'
            );

            return response()->json([
                'success' => true,
                'message' => 'Approval workflow berhasil diperbarui.',
                'data' => $workflow->fresh()->load('steps.approverRole'),
            ]);

        } catch (Exception $e) {

            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Gagal update approval workflow.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $workflow = ApprovalWorkflow::findOrFail($id);

        $inUse = PayrollPeriod::where('approval_workflow_id', $workflow->id)
            ->whereIn('status', ['Submitted', 'Approved'])
            ->exists();

        if ($inUse) {
            return response()->json([
                'success' => false,
                'message' => 'Workflow ini sedang dipakai oleh periode payroll yang lagi proses approval, tidak bisa dihapus.'
            ], 422);
        }

        $workflow->delete();

        AuditLogService::log(
            $workflow,
            'deleted',
            $workflow->only(['name', 'applies_to_period_type']),
            null,
            $request->user()->id,
            'Hapus approval workflow'
        );

        return response()->json([
            'success' => true,
            'message' => 'Approval workflow berhasil dihapus.'
        ]);
    }

    /**
     * Validasi: level harus 1,2,3,... berurutan tanpa lompat/duplikat,
     * dan approver_role_id harus salah satu dari MANAGER/FINANCE/HRD.
     */
    private function validateSteps(array $steps): ?string
    {
        $levels = collect($steps)->pluck('level')->sort()->values();

        $expected = range(1, count($levels));

        if ($levels->toArray() !== $expected) {
            return 'Level approval harus berurutan mulai dari 1 tanpa lompat atau duplikat (contoh: 1,2,3 - bukan 1,3 atau 1,1,2).';
        }

        $roleIds = collect($steps)->pluck('approver_role_id')->unique();

        $invalidRoles = Role::whereIn('id', $roleIds)
            ->whereNotIn('role_code', self::ALLOWED_APPROVER_ROLES)
            ->pluck('role_code');

        if ($invalidRoles->isNotEmpty()) {
            return 'Role approver cuma boleh MANAGER, FINANCE, atau HRD. Ditemukan role tidak valid: ' . $invalidRoles->implode(', ') . '. SUPER_ADMIN sengaja tidak diperbolehkan jadi approver operasional.';
        }

        return null;
    }
}
