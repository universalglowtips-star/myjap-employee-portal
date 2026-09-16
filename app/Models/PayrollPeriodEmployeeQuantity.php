<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Task 15b - "Jumlah" per periode per karyawan per komponen
 * scheduled_variable (Hari Kerja utk Uang Harian, Jumlah Resi utk Bonus
 * DLV, dst). Diisi HRD SEBELUM generateBulk() - generate baca quantity x
 * tarif dari sini. quantity per KOMPONEN (bukan 1 angka global per
 * karyawan per periode) - 2 komponen scheduled_variable buat 1 karyawan
 * bisa punya jumlah yang beda (Hari Kerja vs Jumlah Resi independen).
 */
class PayrollPeriodEmployeeQuantity extends Model
{
    protected $fillable = [
        'payroll_period_id',
        'employee_id',
        'salary_component_id',
        'quantity',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
        ];
    }

    public function payrollPeriod(): BelongsTo
    {
        return $this->belongsTo(PayrollPeriod::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class)->withTrashed();
    }

    public function salaryComponent(): BelongsTo
    {
        return $this->belongsTo(SalaryComponent::class)->withTrashed();
    }
}
