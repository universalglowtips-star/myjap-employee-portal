<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Leave extends Model
{
    use SoftDeletes;

    protected $fillable = [

        'employee_id',

        'leave_type',

        'start_date',

        'end_date',

        'total_days',

        'reason',

        'attachment',

        'status',

        'approved_by',

        'approved_at',

        'approval_notes',

    ];

    protected function casts(): array
    {
        return [

            'start_date' => 'date:Y-m-d',

            'end_date' => 'date:Y-m-d',

            'approved_at' => 'datetime:Y-m-d H:i:s',

            'total_days' => 'integer',

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

    public function approver(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'approved_by');
    }

    protected function serializeDate(\DateTimeInterface $date): string
    {
        return $date->format('Y-m-d H:i:s');
    }
}