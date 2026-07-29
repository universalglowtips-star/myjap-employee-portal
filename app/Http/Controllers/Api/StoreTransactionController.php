<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreItem;
use App\Models\StoreTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;

class StoreTransactionController extends Controller
{
    /**
     * Query params: store_item_id, type (in/out), employee_id,
     * start_date, end_date, per_page
     */
    public function index(Request $request): JsonResponse
    {
        $query = StoreTransaction::with(['storeItem', 'employee', 'creator'])
            ->when($request->filled('store_item_id'), function ($q) use ($request) {
                $q->where('store_item_id', $request->store_item_id);
            })
            ->when($request->filled('type'), function ($q) use ($request) {
                $q->where('type', $request->type);
            })
            ->when($request->filled('employee_id'), function ($q) use ($request) {
                $q->where('employee_id', $request->employee_id);
            })
            ->when($request->filled('start_date'), function ($q) use ($request) {
                $q->whereDate('transaction_date', '>=', $request->start_date);
            })
            ->when($request->filled('end_date'), function ($q) use ($request) {
                $q->whereDate('transaction_date', '<=', $request->end_date);
            })
            ->latest();

        $transactions = $query->paginate($request->integer('per_page', 10));

        return response()->json([
            'success' => true,
            'message' => 'Data transaksi barang berhasil diambil.',
            'total' => $transactions->total(),
            'data' => $transactions->items(),
            'pagination' => [
                'current_page' => $transactions->currentPage(),
                'per_page' => $transactions->perPage(),
                'last_page' => $transactions->lastPage(),
            ]
        ]);
    }

    /**
     * Bikin transaksi stok masuk/keluar. Stok item otomatis ter-update,
     * transaksi 'out' divalidasi supaya stok gak sampai minus.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'store_item_id' => 'required|exists:store_items,id',
            'type' => 'required|in:in,out',
            'quantity' => 'required|integer|min:1',
            'employee_id' => 'nullable|exists:employees,id',
            'transaction_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        $item = StoreItem::findOrFail($validated['store_item_id']);

        if ($validated['type'] === 'out' && $item->stock_quantity < $validated['quantity']) {
            return response()->json([
                'success' => false,
                'message' => "Stok tidak cukup. Sisa stok {$item->stock_quantity}, diminta {$validated['quantity']}."
            ], 422);
        }

        DB::beginTransaction();

        try {

            $transaction = StoreTransaction::create($validated + [
                'created_by' => $request->user()->id,
            ]);

            $item->increment('stock_quantity', $validated['type'] === 'in' ? $validated['quantity'] : -$validated['quantity']);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Transaksi barang berhasil dicatat.',
                'data' => $transaction->load(['storeItem', 'employee', 'creator']),
            ], 201);

        } catch (Exception $e) {

            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Gagal mencatat transaksi.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show(string $id): JsonResponse
    {
        $transaction = StoreTransaction::with(['storeItem', 'employee', 'creator'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail transaksi berhasil diambil.',
            'data' => $transaction,
        ]);
    }

    /**
     * Batalkan transaksi (bukan hapus diam-diam) - stok dikembalikan
     * ke kondisi sebelum transaksi ini terjadi, lalu record dihapus.
     * Supaya histori tetap bisa dipertanggungjawabkan, ini cuma boleh
     * dilakukan pada transaksi yang baru dibuat hari ini.
     */
    public function destroy(string $id): JsonResponse
    {
        $transaction = StoreTransaction::findOrFail($id);

        if (!$transaction->created_at->isToday()) {
            return response()->json([
                'success' => false,
                'message' => 'Transaksi cuma bisa dibatalkan di hari yang sama saat dibuat, untuk menjaga histori stok tetap akurat.'
            ], 422);
        }

        $item = StoreItem::findOrFail($transaction->store_item_id);

        DB::beginTransaction();

        try {

            // Balikin stok ke kondisi sebelum transaksi ini
            $item->increment('stock_quantity', $transaction->type === 'in' ? -$transaction->quantity : $transaction->quantity);

            $transaction->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil dibatalkan, stok dikembalikan.',
            ]);

        } catch (Exception $e) {

            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Gagal membatalkan transaksi.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
