<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayrollPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollPeriodController extends Controller
{
    /**
     * List semua payroll period. Read-only untuk Tahap 0 - manajemen
     * penuh (submit/approve/publish per periode) menyusul di Tahap 1
     * (Payroll Approval Workflow).
     */
    public function index(Request $request): JsonResponse
    {
        $query = PayrollPeriod::withCount('payslips')
            ->when($request->filled('period_type'), fn ($q) => $q->where('period_type', $request->period_type))
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
            'payslips.employee',
        ])->findOrFail($id);

        $summary = [
            'total_payslips' => $period->payslips->count(),
            'total_net_salary' => $period->payslips->sum('net_salary'),
            'total_gross_earning' => $period->payslips->sum('gross_earning'),
            'total_deduction' => $period->payslips->sum('total_deduction'),
            'draft_count' => $period->payslips->where('status', 'Draft')->count(),
            'published_count' => $period->payslips->where('status', 'Published')->count(),
        ];

        return response()->json([
            'success' => true,
            'message' => 'Detail payroll period berhasil diambil.',
            'data' => $period,
            'summary' => $summary,
        ]);
    }
}
