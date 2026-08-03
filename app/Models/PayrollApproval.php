<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use RuntimeException;

class PayrollApproval extends Model
{
    protected $fillable = [
        'payroll_period_id',
        'submission_cycle',
        'level',
        'approver_role_id',
        'restrict_to_office_location',
        'status',
        'acted_by',
        'acted_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'acted_at' => 'datetime:Y-m-d H:i:s',
            'restrict_to_office_location' => 'boolean',
        ];
    }

    public function payrollPeriod(): BelongsTo
    {
        return $this->belongsTo(PayrollPeriod::class);
    }

    public function approverRole(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'approver_role_id')->withTrashed();
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'acted_by')->withTrashed();
    }

    /**
     * Immutability guard - baris approval yang SUDAH di-acted (Approved
     * atau Rejected) adalah jejak audit permanen, gak boleh diubah lagi
     * lewat jalur manapun. Baris Pending masih boleh diubah (itu memang
     * proses approve()/reject() yang mengisi status+acted_by+acted_at).
     */
    protected static function booted(): void
    {
        static::deleting(function () {
            throw new RuntimeException('Riwayat approval adalah audit trail permanen, tidak boleh dihapus dengan cara apapun.');
        });

        static::updating(function (self $approval) {

            if ($approval->getOriginal('status') !== 'Pending') {
                throw new RuntimeException('Riwayat approval yang sudah di-approve/reject bersifat immutable, tidak bisa diubah lagi.');
            }
        });
    }
}
