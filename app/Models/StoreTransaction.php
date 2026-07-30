<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreTransaction extends Model
{
    protected $fillable = [

        'store_item_id',

        'type',

        'quantity',

        'employee_id',

        'created_by',

        'transaction_date',

        'notes',

    ];

    protected function casts(): array
    {
        return [

            'quantity' => 'integer',

            'transaction_date' => 'date:Y-m-d',

        ];
    }

    public function storeItem(): BelongsTo
    {
        return $this->belongsTo(StoreItem::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class)->withTrashed();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'created_by')->withTrashed();
    }
}
