<?php

namespace App\Http\Controllers\Api;


use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLeaveRequest;
use App\Http\Requests\UpdateLeaveRequest;
use App\Models\Leave;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class LeaveController extends Controller
{
/**
 * Display a listing of the resource.
 */
public function index(): JsonResponse
{
    $leaves = Leave::with([
        'employee',
        'approver'
    ])
    ->latest()
    ->get();

    return response()->json([
        'success' => true,
        'message' => 'Data pengajuan cuti berhasil diambil.',
        'total' => $leaves->count(),
        'data' => $leaves
    ]);
}

public function store(StoreLeaveRequest $request)
{
    $validated = $request->validated();

    // Hitung total hari cuti otomatis
    $validated['total_days'] = Carbon::parse($validated['start_date'])
        ->diffInDays(Carbon::parse($validated['end_date'])) + 1;

    $leave = Leave::create($validated);

    return response()->json([
        'success' => true,
        'message' => 'Data cuti berhasil ditambahkan.',
        'data' => $leave->load(['employee', 'approver'])
    ], 201);
}

public function show(string $id): JsonResponse
{
    $leave = Leave::with([
        'employee',
        'approver'
    ])->findOrFail($id);

    return response()->json([
        'success' => true,
        'message' => 'Detail pengajuan cuti berhasil diambil.',
        'data' => $leave
    ]);
}

    /**
     * Update the specified resource in storage.
     */
public function update(UpdateLeaveRequest $request, string $id): JsonResponse
{
    $leave = Leave::findOrFail($id);

    $validated = $request->validated();

    if (isset($validated['start_date']) || isset($validated['end_date'])) {

        $start = $validated['start_date'] ?? $leave->start_date;
        $end = $validated['end_date'] ?? $leave->end_date;

        $validated['total_days'] =
            Carbon::parse($start)->diffInDays(Carbon::parse($end)) + 1;
    }

    if (
        isset($validated['status']) &&
        $validated['status'] === 'Approved' &&
        empty($validated['approved_at'])
    ) {
        $validated['approved_at'] = now();
    }

    $leave->update($validated);

    $leave->refresh()->load([
        'employee',
        'approver'
    ]);

    return response()->json([
        'success' => true,
        'message' => 'Pengajuan cuti berhasil diperbarui.',
        'data' => $leave
    ]);
}

    /**
     * Remove the specified resource from storage.
     */
public function destroy(string $id): JsonResponse
{
    $leave = Leave::findOrFail($id);

    $leave->delete();

    return response()->json([
        'success' => true,
        'message' => 'Pengajuan cuti berhasil dihapus.'
    ]);
}

}