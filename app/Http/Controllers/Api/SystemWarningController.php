<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemWarning;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemWarningController extends Controller
{
    /**
     * List warning operasional - default cuma yang BELUM di-resolve,
     * biar HRD/SUPER_ADMIN langsung lihat yang butuh perhatian.
     *
     * `related` (morphTo) ikut di-eager-load (Fase 2, halaman manajemen
     * System Warnings) - frontend butuh data entitas terkait (mis.
     * PayrollPeriod.period_code) buat bikin deep-link, bukan cuma
     * related_type/related_id mentah. Aman kalau null (baris tanpa
     * entitas terkait) - Eloquent morphTo yang null cuma balik null,
     * gak error.
     */
    public function index(Request $request): JsonResponse
    {
        $query = SystemWarning::with(['related', 'resolver'])
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->type))
            ->when(!$request->boolean('include_resolved'), fn ($q) => $q->where('is_resolved', false))
            ->latest();

        $warnings = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'message' => 'Data system warning berhasil diambil.',
            'total' => $warnings->total(),
            'data' => $warnings->items(),
            'pagination' => [
                'current_page' => $warnings->currentPage(),
                'per_page' => $warnings->perPage(),
                'last_page' => $warnings->lastPage(),
            ]
        ]);
    }

    /**
     * Tandai warning ini sudah ditangani/gak relevan lagi.
     */
    public function resolve(Request $request, string $id): JsonResponse
    {
        $warning = SystemWarning::findOrFail($id);

        if ($warning->is_resolved) {
            return response()->json([
                'success' => false,
                'message' => 'Warning ini sudah pernah di-resolve sebelumnya.'
            ], 422);
        }

        $warning->update([
            'is_resolved' => true,
            'resolved_by' => $request->user()->id,
            'resolved_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'System warning berhasil ditandai selesai.',
            'data' => $warning->fresh()->load('resolver'),
        ]);
    }
}
