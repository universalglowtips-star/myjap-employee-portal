<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use RuntimeException;

class AuditLog extends Model
{
    const UPDATED_AT = null; // log gak pernah di-update, cuma dibuat sekali

    protected $fillable = [

        'auditable_type',

        'auditable_id',

        'action',

        'old_values',

        'new_values',

        'changed_by',

        'ip_address',

        'source',

        'user_agent',

        'description',

    ];

    protected function casts(): array
    {
        return [

            'old_values' => 'array',

            'new_values' => 'array',

            'created_at' => 'datetime:Y-m-d H:i:s',

        ];
    }

    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'changed_by');
    }

    /**
     * Immutability guard - audit log yang sudah tercatat TIDAK BOLEH
     * diubah atau dihapus lewat kode apapun (termasuk tinker), supaya
     * benar-benar bisa dipercaya sebagai jejak audit resmi. Satu-satunya
     * cara "menghapus" adalah lewat kebijakan retensi data di level
     * database langsung (di luar aplikasi), bukan lewat Eloquent.
     */
    protected static function booted(): void
    {
        static::updating(function () {
            throw new RuntimeException('Audit log bersifat immutable dan tidak boleh diubah.');
        });

        static::deleting(function () {
            throw new RuntimeException('Audit log bersifat immutable dan tidak boleh dihapus.');
        });
    }
}
