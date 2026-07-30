<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * Query params: auditable_type (nama model pendek, misal "Employee"),
     * auditable_id, action, changed_by, start_date, end_date, per_page
     */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with('changedBy')
            ->when($request->filled('auditable_type'), function ($q) use ($request) {
                // Boleh kirim nama pendek (Employee) atau full namespace
                $type = str_contains($request->auditable_type, '\\')
                    ? $request->auditable_type
                    : 'App\\Models\\' . $request->auditable_type;

                $q->where('auditable_type', $type);
            })
            ->when($request->filled('auditable_id'), function ($q) use ($request) {
                $q->where('auditable_id', $request->auditable_id);
            })
            ->when($request->filled('action'), function ($q) use ($request) {
                $q->where('action', $request->action);
            })
            ->when($request->filled('changed_by'), function ($q) use ($request) {
                $q->where('changed_by', $request->changed_by);
            })
            ->when($request->filled('start_date'), function ($q) use ($request) {
                $q->whereDate('created_at', '>=', $request->start_date);
            })
            ->when($request->filled('end_date'), function ($q) use ($request) {
                $q->whereDate('created_at', '<=', $request->end_date);
            })
            ->latest();

        $logs = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'message' => 'Data audit log berhasil diambil.',
            'total' => $logs->total(),
            'data' => $logs->items(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'per_page' => $logs->perPage(),
                'last_page' => $logs->lastPage(),
            ]
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $log = AuditLog::with('changedBy')->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail audit log berhasil diambil.',
            'data' => $log,
        ]);
    }
}
