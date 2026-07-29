<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoreItemController extends Controller
{
    /**
     * Query params: category, is_active, search (nama/kode barang),
     * low_stock (true = cuma tampilin yang stok <= minimum_stock), per_page
     */
    public function index(Request $request): JsonResponse
    {
        $query = StoreItem::query()
            ->when($request->filled('category'), function ($q) use ($request) {
                $q->where('category', $request->category);
            })
            ->when($request->filled('is_active'), function ($q) use ($request) {
                $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
            })
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->search;
                $q->where(function ($sub) use ($search) {
                    $sub->where('item_name', 'like', "%{$search}%")
                        ->orWhere('item_code', 'like', "%{$search}%");
                });
            })
            ->when($request->boolean('low_stock'), function ($q) {
                $q->whereColumn('stock_quantity', '<=', 'minimum_stock');
            })
            ->latest();

        $items = $query->paginate($request->integer('per_page', 10));

        return response()->json([
            'success' => true,
            'message' => 'Data barang berhasil diambil.',
            'total' => $items->total(),
            'data' => $items->items(),
            'pagination' => [
                'current_page' => $items->currentPage(),
                'per_page' => $items->perPage(),
                'last_page' => $items->lastPage(),
            ]
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'item_code' => 'required|string|max:30|unique:store_items,item_code',
            'item_name' => 'required|string|max:150',
            'category' => 'nullable|string|max:100',
            'unit' => 'nullable|string|max:20',
            'minimum_stock' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        // Barang baru selalu mulai dari stok 0 - diisi lewat transaksi 'in'
        $item = StoreItem::create($validated + ['stock_quantity' => 0]);

        return response()->json([
            'success' => true,
            'message' => 'Barang berhasil ditambahkan.',
            'data' => $item,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $item = StoreItem::with(['transactions' => function ($q) {
            $q->latest()->limit(10);
        }, 'transactions.employee', 'transactions.creator'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail barang berhasil diambil.',
            'data' => $item,
        ]);
    }

    /**
     * Update data barang. stock_quantity TIDAK bisa diedit dari sini -
     * harus lewat transaksi in/out biar histori tetap akurat.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $item = StoreItem::findOrFail($id);

        $validated = $request->validate([
            'item_code' => 'sometimes|string|max:30|unique:store_items,item_code,' . $item->id,
            'item_name' => 'sometimes|string|max:150',
            'category' => 'nullable|string|max:100',
            'unit' => 'sometimes|string|max:20',
            'minimum_stock' => 'sometimes|integer|min:0',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $item->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Data barang berhasil diperbarui.',
            'data' => $item->fresh(),
        ]);
    }

    /**
     * Soft delete. Barang yang masih punya stok tidak boleh dihapus
     * (harus dikeluarkan dulu semua lewat transaksi 'out').
     */
    public function destroy(string $id): JsonResponse
    {
        $item = StoreItem::findOrFail($id);

        if ($item->stock_quantity > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Barang masih memiliki stok (' . $item->stock_quantity . '). Keluarkan semua stok dulu sebelum menghapus.'
            ], 422);
        }

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Barang berhasil dihapus.',
        ]);
    }
}
