<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApprovalWorkflow;
use App\Models\Employee;
use App\Models\Notification;
use App\Models\PayrollApproval;
use App\Models\PayrollPeriod;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;

class PayrollPeriodController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PayrollPeriod::withCount('payslips')
            ->with('officeLocation')
            ->when($request->filled('period_type'), fn ($q) => $q->where('period_type', $request->period_type))
            ->when($request->filled('office_location_id'), fn ($q) => $q->where('office_location_id', $request->office_location_id))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('year'), fn ($q) => $q->whereYear('period_start', $request->year))
            ->latest('period_start');

        $periods = $query->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'message' => 'Data payroll period berhasil diambil.',
            'total' => $periods->total(),
            'data' => $periods->items(),
            'pagination' => [
                'current_page' => $periods->currentPage(),
                'per_page' => $periods->perPage(),
                'last_page' => $periods->lastPage(),
            ]
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $period = PayrollPeriod::with([
            'creator',
            'publisher',
            'submitter',
            'officeLocation',
            'approvalWorkflow.steps.approverRole',
            'approvals.approverRole',
            'approvals.actor',
            'payslips.employee',
        ])->findOrFail($id);

        $summary = [
            'total_payslips' => $period->payslips->count(),
            'total_net_salary' => $period->payslips->sum('net_salary'),
            'total_gross_earning' => $period->payslips->sum('gross_earning'),
            'total_deduction' => $period->payslips->sum('total_deduction'),
            'draft_count' => $period->payslips->where('status', 'Draft')->count(),
            'published_count' => $period->payslips->where('status', 'Published')->count(),
            // Riwayat approval LENGKAP, dikelompokkan per percobaan submit -
            // cycle 1 mungkin di-reject, cycle 2 resubmit & lolos, dst.
            // Semuanya tetap ada di sini sebagai audit trail permanen.
            'approval_history_by_cycle' => $period->approvals
                ->groupBy('submission_cycle')
                ->map(fn ($group) => $group->values())
                ->sortKeys(),
        ];

        return response()->json([
            'success' => true,
            'message' => 'Detail payroll period berhasil diambil.',
            'data' => $period,
            'summary' => $summary,
        ]);
    }

    /**
     * Submit periode buat mulai proses approval. Kalau period_type ini
     * gak punya workflow AKTIF, langsung lompat ke Approved (approval
     * dianggap gak dibutuhkan - configurable on/off).
     */
    public function submit(Request $request, string $id): JsonResponse
    {
        $period = PayrollPeriod::findOrFail($id);

        if ($period->status !== 'Draft') {
            return response()->json([
                'success' => false,
                'message' => "Periode ini statusnya '{$period->status}', cuma periode berstatus Draft yang bisa disubmit."
            ], 422);
        }

        if ($period->payslips()->count() === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Periode ini belum punya payslip sama sekali, tidak bisa disubmit.'
            ], 422);
        }

        $workflow = ApprovalWorkflow::activeFor($period->period_type);

        try {

            DB::transaction(function () use ($period, $workflow, $request) {

                $newCycle = $period->submission_cycle + 1;

                if (!$workflow || $workflow->steps->isEmpty()) {

                    $period->update([
                        'submission_cycle' => $newCycle,
                        'status' => 'Approved',
                        'current_approval_level' => null,
                        'submitted_at' => now(),
                        'submitted_by' => $request->user()->id,
                    ]);

                    AuditLogService::log(
                        $period,
                        'submitted',
                        null,
                        ['status' => 'Approved', 'note' => 'Tidak ada workflow approval aktif, langsung Approved'],
                        $request->user()->id,
                        'Submit payroll period (tanpa approval - workflow tidak aktif)'
                    );

                    return;
                }

                foreach ($workflow->steps as $step) {
                    PayrollApproval::create([
                        'payroll_period_id' => $period->id,
                        'submission_cycle' => $newCycle,
                        'level' => $step->level,
                        'approver_role_id' => $step->approver_role_id,
                        'restrict_to_office_location' => $step->restrict_to_office_location,
                        'status' => 'Pending',
                    ]);
                }

                $firstLevel = $workflow->steps->first();

                $period->update([
                    'approval_workflow_id' => $workflow->id,
                    'submission_cycle' => $newCycle,
                    'status' => 'Submitted',
                    'current_approval_level' => $firstLevel->level,
                    'submitted_at' => now(),
                    'submitted_by' => $request->user()->id,
                ]);

                AuditLogService::log(
                    $period,
                    'submitted',
                    null,
                    ['status' => 'Submitted', 'workflow' => $workflow->name, 'submission_cycle' => $newCycle],
                    $request->user()->id,
                    'Submit payroll period untuk approval'
                );

                $this->notifyRoleHolders(
                    $firstLevel->approver_role_id,
                    'payroll_pending_approval',
                    'Payroll Menunggu Approval Kamu',
                    "Payroll periode {$period->period_code} menunggu approval level {$firstLevel->level}.",
                    ['payroll_period_id' => $period->id]
                );
            });

        } catch (Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'Gagal submit payroll period.',
                'error' => $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Payroll period berhasil disubmit.',
            'data' => $period->fresh()->load(['approvalWorkflow.steps.approverRole', 'currentCycleApprovals.approverRole']),
        ]);
    }

    /**
     * Approve level yang LAGI PENDING sekarang. Gak ada parameter
     * "level" dari klien sama sekali - server yang nentuin level mana
     * yang lagi giliran, jadi gak ada cara buat klien "lompatin" urutan
     * approval lewat request manapun.
     */
    public function approve(Request $request, string $id): JsonResponse
    {
        $period = PayrollPeriod::findOrFail($id);

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        [$currentApproval, $errorResponse] = $this->resolveCurrentPendingApproval($period, $request);

        if ($errorResponse) {
            return $errorResponse;
        }

        try {

            DB::transaction(function () use ($period, $currentApproval, $request, $validated) {

                $currentApproval->update([
                    'status' => 'Approved',
                    'acted_by' => $request->user()->id,
                    'acted_at' => now(),
                    'notes' => $validated['notes'] ?? null,
                ]);

                AuditLogService::log(
                    $period,
                    'approved',
                    ['level' => $currentApproval->level, 'status' => 'Submitted'],
                    ['level' => $currentApproval->level, 'action' => 'Approved'],
                    $request->user()->id,
                    "Approve payroll period level {$currentApproval->level}"
                );

                $nextStep = $period->approvalWorkflow->steps
                    ->firstWhere('level', $currentApproval->level + 1);

                if ($nextStep) {

                    $period->update(['current_approval_level' => $nextStep->level]);

                    $this->notifyRoleHolders(
                        $nextStep->approver_role_id,
                        'payroll_pending_approval',
                        'Payroll Menunggu Approval Kamu',
                        "Payroll periode {$period->period_code} menunggu approval level {$nextStep->level}.",
                        ['payroll_period_id' => $period->id]
                    );

                } else {

                    $period->update([
                        'status' => 'Approved',
                        'current_approval_level' => null,
                    ]);

                    if ($period->submitted_by) {
                        Notification::notify(
                            $period->submitted_by,
                            'payroll_fully_approved',
                            'Payroll Siap Dipublish',
                            "Payroll periode {$period->period_code} sudah lolos semua approval, siap dipublish.",
                            ['payroll_period_id' => $period->id]
                        );
                    }
                }
            });

        } catch (Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'Gagal approve payroll period.',
                'error' => $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Payroll period berhasil di-approve.',
            'data' => $period->fresh()->load(['currentCycleApprovals.approverRole', 'currentCycleApprovals.actor']),
        ]);
    }

    /**
     * Reject level yang lagi pending - periode balik ke Draft, semua
     * approval di cycle ini (termasuk yang sudah Approved sebelumnya)
     * TETAP TERSIMPAN sebagai riwayat, tidak dihapus/diubah.
     */
    public function reject(Request $request, string $id): JsonResponse
    {
        $period = PayrollPeriod::findOrFail($id);

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        [$currentApproval, $errorResponse] = $this->resolveCurrentPendingApproval($period, $request);

        if ($errorResponse) {
            return $errorResponse;
        }

        try {

            DB::transaction(function () use ($period, $currentApproval, $request, $validated) {

                $currentApproval->update([
                    'status' => 'Rejected',
                    'acted_by' => $request->user()->id,
                    'acted_at' => now(),
                    'notes' => $validated['reason'],
                ]);

                $period->update([
                    'status' => 'Draft',
                    'current_approval_level' => null,
                ]);

                AuditLogService::log(
                    $period,
                    'rejected',
                    ['level' => $currentApproval->level, 'status' => 'Submitted'],
                    ['status' => 'Draft', 'rejected_at_level' => $currentApproval->level, 'reason' => $validated['reason']],
                    $request->user()->id,
                    "Reject payroll period di level {$currentApproval->level}: {$validated['reason']}"
                );

                if ($period->submitted_by) {
                    Notification::notify(
                        $period->submitted_by,
                        'payroll_rejected',
                        'Payroll Ditolak',
                        "Payroll periode {$period->period_code} ditolak di level {$currentApproval->level}. Alasan: {$validated['reason']}",
                        ['payroll_period_id' => $period->id]
                    );
                }
            });

        } catch (Exception $e) {

            return response()->json([
                'success' => false,
                'message' => 'Gagal reject payroll period.',
                'error' => $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Payroll period ditolak, kembali ke status Draft untuk direvisi.',
            'data' => $period->fresh(),
        ]);
    }

    /**
     * Daftar periode yang lagi nunggu approval DARI USER YANG LOGIN
     * (berdasarkan role_id-nya cocok sama level yang lagi pending).
     */
    public function pendingMyApproval(Request $request): JsonResponse
    {
        $user = $request->user();

        $periods = PayrollPeriod::where('status', 'Submitted')
            ->with(['approvalWorkflow', 'creator', 'submitter'])
            ->get()
            ->filter(function (PayrollPeriod $period) use ($user) {

                $currentApproval = PayrollApproval::where('payroll_period_id', $period->id)
                    ->where('submission_cycle', $period->submission_cycle)
                    ->where('level', $period->current_approval_level)
                    ->where('status', 'Pending')
                    ->first();

                if (!$currentApproval || (int) $currentApproval->approver_role_id !== (int) $user->role_id) {
                    return false;
                }

                if ($currentApproval->restrict_to_office_location) {
                    return (int) $user->office_location_id === (int) $period->office_location_id;
                }

                return true;
            })
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Daftar payroll period yang menunggu approval kamu berhasil diambil.',
            'total' => $periods->count(),
            'data' => $periods,
        ]);
    }

    /**
     * Ambil baris payroll_approvals yang lagi Pending buat level SEKARANG
     * (bukan dari input klien), lalu pastikan role user yang login cocok.
     */
    private function resolveCurrentPendingApproval(PayrollPeriod $period, Request $request): array
    {
        if ($period->status !== 'Submitted') {
            return [null, response()->json([
                'success' => false,
                'message' => "Periode ini statusnya '{$period->status}', bukan Submitted - tidak ada approval yang bisa diproses."
            ], 422)];
        }

        $currentApproval = PayrollApproval::where('payroll_period_id', $period->id)
            ->where('submission_cycle', $period->submission_cycle)
            ->where('level', $period->current_approval_level)
            ->where('status', 'Pending')
            ->first();

        if (!$currentApproval) {
            return [null, response()->json([
                'success' => false,
                'message' => 'Tidak ditemukan approval level yang sedang pending untuk periode ini.'
            ], 422)];
        }

        $user = $request->user();
        $isSuperAdmin = $user->role && $user->role->role_code === 'SUPER_ADMIN';

        if (!$isSuperAdmin && (int) $currentApproval->approver_role_id !== (int) $user->role_id) {
            return [null, response()->json([
                'success' => false,
                'message' => 'Bukan giliran role kamu untuk approve/reject level ini.'
            ], 403)];
        }

        // Level ini branch-scoped (misal Manager cabang) - approver
        // WAJIB berkantor di cabang yang SAMA PERSIS sama periode ini.
        // Manager cabang lain gak bisa approve payroll cabang yang
        // bukan tanggung jawabnya, walau role-nya sama-sama MANAGER.
        if (!$isSuperAdmin && $currentApproval->restrict_to_office_location) {

            if ((int) $user->office_location_id !== (int) $period->office_location_id) {
                return [null, response()->json([
                    'success' => false,
                    'message' => 'Level approval ini dibatasi per cabang - kamu bukan penanggung jawab cabang periode ini.'
                ], 403)];
            }
        }

        return [$currentApproval, null];
    }

    /**
     * Kirim notifikasi ke SEMUA employee aktif yang punya role tertentu -
     * dipakai karena approver ditentukan by Role, bukan per-individu.
     */
    private function notifyRoleHolders(int $roleId, string $type, string $title, string $message, array $data): void
    {
        Employee::where('role_id', $roleId)
            ->where('is_active', true)
            ->pluck('id')
            ->each(function ($employeeId) use ($type, $title, $message, $data) {
                Notification::notify($employeeId, $type, $title, $message, $data);
            });
    }
}
