<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payslip extends Model
{
    use SoftDeletes;

    protected $fillable = [

        'employee_id',

        'month',

        'year',

        'net_salary',

        'status',

        'file_pdf',

        'published_by',

        'published_at',

        'unpublish_reason',

    ];

    protected function casts(): array
    {
        return [

            'net_salary' => 'decimal:2',

            'published_at' => 'datetime:Y-m-d H:i:s',

        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Relationship
    |--------------------------------------------------------------------------
    */

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'published_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PayslipItem::class);
    }
}