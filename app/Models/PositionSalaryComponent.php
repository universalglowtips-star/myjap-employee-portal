<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Task 15b - default nominal (category fixed) ATAU tarif (category
 * scheduled_variable) per Jabatan, per Komponen Gaji. Keberadaan baris =
 * komponen ini berlaku buat jabatan ini - absennya baris = TIDAK berlaku
 * sama sekali (bukan default 0), lihat PayslipController::generateBulk().
 */
class PositionSalaryComponent extends Model
{
    protected $fillable = [
        'position_id',
        'salary_component_id',
        'amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class)->withTrashed();
    }

    public function salaryComponent(): BelongsTo
    {
        return $this->belongsTo(SalaryComponent::class)->withTrashed();
    }
}
