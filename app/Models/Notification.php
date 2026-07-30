<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $fillable = [

        'employee_id',

        'type',

        'title',

        'message',

        'data',

        'is_read',

        'read_at',

    ];

    protected function casts(): array
    {
        return [

            'data' => 'array',

            'is_read' => 'boolean',

            'read_at' => 'datetime:Y-m-d H:i:s',

        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class)->withTrashed();
    }

    /**
     * Helper buat bikin notifikasi baru dari controller lain
     * (LeaveController, PayslipController, dll) tanpa perlu
     * nulis ulang struktur array tiap kali.
     */
    public static function notify(int $employeeId, string $type, string $title, string $message, ?array $data = null): self
    {
        return self::create([
            'employee_id' => $employeeId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
        ]);
    }
}
