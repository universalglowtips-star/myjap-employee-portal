<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Daftar notifikasi milik employee yang sedang login.
     * Query params: is_read (true/false), per_page
     */
    public function index(Request $request): JsonResponse
    {
        $query = Notification::where('employee_id', $request->user()->id)
            ->when($request->filled('is_read'), function ($q) use ($request) {
                $q->where('is_read', filter_var($request->is_read, FILTER_VALIDATE_BOOLEAN));
            })
            ->latest();

        $notifications = $query->paginate($request->integer('per_page', 15));

        return response()->json([
            'success' => true,
            'message' => 'Data notifikasi berhasil diambil.',
            'total' => $notifications->total(),
            'data' => $notifications->items(),
            'pagination' => [
                'current_page' => $notifications->currentPage(),
                'per_page' => $notifications->perPage(),
                'last_page' => $notifications->lastPage(),
            ]
        ]);
    }

    /**
     * Jumlah notifikasi yang belum dibaca - buat badge counter di UI.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $count = Notification::where('employee_id', $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'data' => ['unread_count' => $count],
        ]);
    }

    /**
     * Tandai satu notifikasi sudah dibaca.
     * Hanya boleh menandai notifikasi milik sendiri.
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = Notification::where('employee_id', $request->user()->id)
            ->findOrFail($id);

        if (!$notification->is_read) {
            $notification->update([
                'is_read' => true,
                'read_at' => now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Notifikasi ditandai sudah dibaca.',
            'data' => $notification->fresh(),
        ]);
    }

    /**
     * Tandai semua notifikasi milik sendiri sebagai sudah dibaca.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $updated = Notification::where('employee_id', $request->user()->id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Semua notifikasi ditandai sudah dibaca.',
            'total_updated' => $updated,
        ]);
    }

    /**
     * Hapus satu notifikasi milik sendiri.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $notification = Notification::where('employee_id', $request->user()->id)
            ->findOrFail($id);

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notifikasi berhasil dihapus.',
        ]);
    }
}
