<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StoreItem extends Model
{
    use SoftDeletes;

    protected $fillable = [

        'item_code',

        'item_name',

        'category',

        'unit',

        'stock_quantity',

        'minimum_stock',

        'description',

        'is_active',

    ];

    protected function casts(): array
    {
        return [

            'stock_quantity' => 'integer',

            'minimum_stock' => 'integer',

            'is_active' => 'boolean',

        ];
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(StoreTransaction::class);
    }

    /**
     * Cek apakah stok sudah di bawah batas minimum - buat alert HRD/gudang.
     */
    public function getIsLowStockAttribute(): bool
    {
        return $this->stock_quantity <= $this->minimum_stock;
    }
}
