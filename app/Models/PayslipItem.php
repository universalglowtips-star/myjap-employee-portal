<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use RuntimeException;

class PayslipItem extends Model
{
    use SoftDeletes;

    protected $fillable = [

    'payslip_id',

    'salary_component_id',

    'component_code',

    'component_name',

    'component_type',

    'amount',

    'notes',

    'sort_order',

];

    protected function casts(): array
    {
        return [

            'amount' => 'decimal:2',

        ];
    }

    /**
     * Immutability guard - item slip gaji ikut terkunci begitu payslip
     * induknya Published. Gak ada alasan sah buat ubah/hapus rincian
     * komponen gaji yang udah final, walau lewat kode/tinker manapun.
     */
    protected static function booted(): void
    {
        static::forceDeleting(function () {
            throw new RuntimeException('Item slip gaji tidak boleh dihapus permanen.');
        });

        static::updating(function (self $item) {

            if ($item->payslip && $item->payslip->status === 'Published') {
                throw new RuntimeException('Item slip gaji ini terikat payslip yang sudah Published dan bersifat immutable.');
            }

            $period = $item->payslip?->payrollPeriod;

            if ($period && in_array($period->status, ['Submitted', 'Approved'])) {
                throw new RuntimeException('Item slip gaji ini terkunci - periode payroll-nya sedang dalam proses approval.');
            }
        });

        static::deleting(function (self $item) {

            if (!$item->isForceDeleting() && $item->payslip && $item->payslip->status === 'Published') {
                throw new RuntimeException('Item slip gaji ini terikat payslip yang sudah Published, tidak boleh dihapus.');
            }

            $period = $item->payslip?->payrollPeriod;

            if (!$item->isForceDeleting() && $period && in_array($period->status, ['Submitted', 'Approved'])) {
                throw new RuntimeException('Item slip gaji ini terkunci - periode payroll-nya sedang dalam proses approval.');
            }
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Relationship
    |--------------------------------------------------------------------------
    */

    public function payslip(): BelongsTo
    {
        return $this->belongsTo(Payslip::class);
    }

    public function salaryComponent(): BelongsTo
    {
        return $this->belongsTo(SalaryComponent::class);
    }
}