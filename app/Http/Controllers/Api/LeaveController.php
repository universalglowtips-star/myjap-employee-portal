<?php

namespace App\Http\Controllers\Api;


use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLeaveRequest;
use App\Http\Requests\UpdateLeaveRequest;
use App\Models\Leave;
use App\Models\Notification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class LeaveController extends Controller
{
/**
 * Display a listing of the resource.
 *
 * Query params yang didukung:
 * - employee_id : filter berdasarkan karyawan
 * - status      : Pending | Approved | Rejected
 * - leave_type  : Annual Leave, Sick Leave, dll
 * - start_date  : filter cuti yang mulai dari tanggal ini
 * - end_date    : filter cuti yang berakhir sampai tanggal ini
 * - search      : cari di nama karyawan / alasan cuti
 * - per_page    : jumlah data per halaman (default 10)
 */
public function index(Request $request): JsonResponse
{
    $query = Leave::with([
        'employee',
        'approver'
    ])
    ->when($request->filled('employee_id'), function ($q) use ($request) {
        $q->where('employee_id', $request->employee_id);
    })
    ->when($request->filled('status'), function ($q) use ($request) {
        $q->where('status', $request->status);
    })
    ->when($request->filled('leave_type'), function ($q) use ($request) {
        $q->where('leave_type', $request->leave_type);
    })
    ->when($request->filled('start_date'), function ($q) use ($request) {
        $q->whereDate('start_date', '>=', $request->start_date);
    })
    ->when($request->filled('end_date'), function ($q) use ($request) {
        $q->whereDate('end_date', '<=', $request->end_date);
    })
    ->when($request->filled('search'), function ($q) use ($request) {
        $search = $request->search;

        $q->where(function ($sub) use ($search) {
            $sub->where('reason', 'like', "%{$search}%")
                ->orWhereHas('employee', function ($emp) use ($search) {
                    $emp->where('full_name', 'like', "%{$search}%");
                });
        });
    })
    ->latest();

    $leaves = $query->paginate($request->integer('per_page', 10));

    return response()->json([
        'success' => true,
        'message' => 'Data pengajuan cuti berhasil diambil.',
        'total' => $leaves->total(),
        'data' => $leaves->items(),
        'pagination' => [
            'current_page' => $leaves->currentPage(),
            'per_page' => $leaves->perPage(),
            'last_page' => $leaves->lastPage(),
        ]
    ]);
}

public function store(StoreLeaveRequest $request): JsonResponse
{
    $validated = $request->validated();

    $totalDays = Carbon::parse($validated['start_date'])
        ->diffInDays(Carbon::parse($validated['end_date'])) + 1;

    // Upload lampiran (kalau ada)
    $attachment = null;

    if ($request->hasFile('attachment')) {
        $attachment = $request->file('attachment')->store('leaves', 'public');
    }

    $leave = Leave::create([

        'employee_id'    => $validated['employee_id'],
        'leave_type'     => $validated['leave_type'],
        'start_date'     => $validated['start_date'],
        'end_date'       => $validated['end_date'],
        'total_days'     => $totalDays,
        'reason'         => $validated['reason'],
        'attachment'     => $attachment,

        // Default system - pengajuan baru selalu mulai dari Pending
        'status'         => 'Pending',
        'approved_by'    => null,
        'approved_at'    => null,
        'approval_notes' => null,

    ]);

    return response()->json([
        'success' => true,
        'message' => 'Pengajuan cuti berhasil dibuat.',
        'data'    => $leave->load([
            'employee',
            'approver'
        ])
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
     *
     * Hanya bisa mengubah pengajuan cuti yang statusnya masih Pending.
     * Perubahan status (approve/reject) tidak lewat sini, lihat approve()/reject().
     */
public function update(UpdateLeaveRequest $request, string $id): JsonResponse
{
    $leave = Leave::findOrFail($id);

    if ($leave->status !== 'Pending') {
        return response()->json([
            'success' => false,
            'message' => 'Pengajuan cuti yang sudah diproses (Approved/Rejected) tidak bisa diubah lagi.'
        ], 422);
    }

    $validated = $request->validated();

    if (isset($validated['start_date']) || isset($validated['end_date'])) {

        $start = $validated['start_date'] ?? $leave->start_date;
        $end = $validated['end_date'] ?? $leave->end_date;

        $validated['total_days'] =
            Carbon::parse($start)->diffInDays(Carbon::parse($end)) + 1;
    }

    if ($request->hasFile('attachment')) {

        // Hapus lampiran lama supaya storage tidak numpuk file yatim
        if ($leave->attachment) {
            Storage::disk('public')->delete($leave->attachment);
        }

        $validated['attachment'] = $request->file('attachment')->store('leaves', 'public');
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
     * Setujui pengajuan cuti.
     * approved_by diambil dari user yang sedang login, bukan dari input client.
     */
public function approve(Request $request, string $id): JsonResponse
{
    $leave = Leave::findOrFail($id);

    if ($leave->status !== 'Pending') {
        return response()->json([
            'success' => false,
            'message' => 'Pengajuan cuti ini sudah pernah diproses sebelumnya.'
        ], 422);
    }

    $validated = $request->validate([
        'approval_notes' => 'nullable|string|max:1000',
    ]);

    $leave->update([
        'status' => 'Approved',
        'approved_by' => $request->user()->id,
        'approved_at' => now(),
        'approval_notes' => $validated['approval_notes'] ?? null,
    ]);

    Notification::notify(
        $leave->employee_id,
        'leave_approved',
        'Pengajuan Cuti Disetujui',
        "Pengajuan cuti {$leave->leave_type} kamu tanggal {$leave->start_date} - {$leave->end_date} telah disetujui.",
        ['leave_id' => $leave->id]
    );

    return response()->json([
        'success' => true,
        'message' => 'Pengajuan cuti berhasil disetujui.',
        'data' => $leave->refresh()->load(['employee', 'approver'])
    ]);
}

    /**
     * Tolak pengajuan cuti. Wajib menyertakan alasan penolakan.
     */
public function reject(Request $request, string $id): JsonResponse
{
    $leave = Leave::findOrFail($id);

    if ($leave->status !== 'Pending') {
        return response()->json([
            'success' => false,
            'message' => 'Pengajuan cuti ini sudah pernah diproses sebelumnya.'
        ], 422);
    }

    $validated = $request->validate([
        'approval_notes' => 'required|string|max:1000',
    ], [
        'approval_notes.required' => 'Alasan penolakan wajib diisi.',
    ]);

    $leave->update([
        'status' => 'Rejected',
        'approved_by' => $request->user()->id,
        'approved_at' => now(),
        'approval_notes' => $validated['approval_notes'],
    ]);

    Notification::notify(
        $leave->employee_id,
        'leave_rejected',
        'Pengajuan Cuti Ditolak',
        "Pengajuan cuti {$leave->leave_type} kamu tanggal {$leave->start_date} - {$leave->end_date} ditolak. Alasan: {$validated['approval_notes']}",
        ['leave_id' => $leave->id]
    );

    return response()->json([
        'success' => true,
        'message' => 'Pengajuan cuti berhasil ditolak.',
        'data' => $leave->refresh()->load(['employee', 'approver'])
    ]);
}

    /**
     * Batalkan cuti yang sudah Approved secara resmi.
     * Berbeda dari update(): ini bukan mengubah data cuti, tapi mencatat
     * pembatalan sebagai riwayat baru (siapa, kapan, alasannya).
     */
public function cancel(Request $request, string $id): JsonResponse
{
    $leave = Leave::findOrFail($id);

    if ($leave->status !== 'Approved') {
        return response()->json([
            'success' => false,
            'message' => 'Hanya cuti dengan status Approved yang bisa dibatalkan.'
        ], 422);
    }

    $validated = $request->validate([
        'cancel_reason' => 'required|string|max:1000',
    ], [
        'cancel_reason.required' => 'Alasan pembatalan wajib diisi.',
    ]);

    $leave->update([
        'status' => 'Cancelled',
        'cancelled_by' => $request->user()->id,
        'cancelled_at' => now(),
        'cancel_reason' => $validated['cancel_reason'],
    ]);

    Notification::notify(
        $leave->employee_id,
        'leave_cancelled',
        'Cuti Dibatalkan',
        "Cuti {$leave->leave_type} kamu tanggal {$leave->start_date} - {$leave->end_date} telah dibatalkan. Alasan: {$validated['cancel_reason']}",
        ['leave_id' => $leave->id]
    );

    return response()->json([
        'success' => true,
        'message' => 'Cuti berhasil dibatalkan.',
        'data' => $leave->refresh()->load(['employee', 'approver', 'canceller'])
    ]);
}

    /**
     * Remove the specified resource from storage.
     * Cuti yang sudah Approved atau Cancelled tidak boleh dihapus (jaga integritas riwayat).
     */
public function destroy(string $id): JsonResponse
{
    $leave = Leave::findOrFail($id);

    if (in_array($leave->status, ['Approved', 'Cancelled'])) {
        return response()->json([
            'success' => false,
            'message' => 'Pengajuan cuti yang sudah disetujui atau dibatalkan tidak bisa dihapus.'
        ], 422);
    }

    if ($leave->attachment) {
        Storage::disk('public')->delete($leave->attachment);
    }

    $leave->delete();

    return response()->json([
        'success' => true,
        'message' => 'Pengajuan cuti berhasil dihapus.'
    ]);
}

}