<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SystemWarning extends Model
{
    protected $fillable = [
        'type',
        'related_type',
        'related_id',
        'message',
        'is_resolved',
        'resolved_by',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'is_resolved' => 'boolean',
            'resolved_at' => 'datetime:Y-m-d H:i:s',
        ];
    }

    public function related(): MorphTo
    {
        return $this->morphTo();
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'resolved_by')->withTrashed();
    }

    /**
     * Helper buat munculin warning baru - dipanggil dari mana aja
     * (mirip pola AuditLogService::log() / Notification::notify()
     * yang sudah ada). Approval/proses bisnis TETAP jalan seperti
     * biasa - ini murni penanda operasional, tidak menghentikan alur apapun.
     *
     * RACE-CONDITION-SAFE: pakai createOrFirst() (bukan cek exists()
     * lalu create() manual, yang rentan TOCTOU kalau 2 request nyaris
     * bersamaan). createOrFirst() coba INSERT dulu; kalau kena unique
     * constraint violation (request lain barusan insert baris yang
     * sama persis), otomatis fallback ambil baris yang sudah ada -
     * dijamin database, bukan cuma pengecekan di level aplikasi.
     */
    public static function raise(string $type, string $message, ?Model $related = null): self
    {
        return self::createOrFirst(
            [
                'type' => $type,
                'related_type' => $related ? get_class($related) : null,
                'related_id' => $related?->getKey(),
                'is_resolved' => false,
            ],
            [
                'message' => $message,
            ]
        );
    }
}
