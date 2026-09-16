<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Task 15b - override nominal/tarif per Karyawan, per Komponen Gaji
 * (misal karena senioritas, walau jabatan sama). Resolusi saat generate:
 * ADA baris di sini -> pakai ini; TIDAK ADA -> fallback ke
 * PositionSalaryComponent lewat employee.position_id; TIDAK ADA juga ->
 * komponen itu TIDAK berlaku buat karyawan ini sama sekali.
 */
class EmployeeSalaryComponent extends Model
{
    protected $fillable = [
        'employee_id',
        'salary_component_id',
        'amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
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
