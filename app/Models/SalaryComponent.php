<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalaryComponent extends Model
{
    use SoftDeletes;

    protected $fillable = [

        'code',

        'name',

        'type',

        'category',

        'default_amount',

        'is_taxable',

        'is_required',

        'is_active',

        'description',

    ];

    protected function casts(): array
    {
        return [

            'default_amount' => 'decimal:2',

            'is_taxable' => 'boolean',

            'is_required' => 'boolean',

            'is_active' => 'boolean',

        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Relationship
    |--------------------------------------------------------------------------
    */

    public function payslipItems(): HasMany
    {
        return $this->hasMany(PayslipItem::class);
    }

    /**
     * Task 15b - default nominal/tarif per Jabatan yang RELEVAN buat
     * komponen ini (cuma dipakai kalau category fixed/scheduled_variable
     * - situational gak punya default tersimpan sama sekali).
     */
    public function positionRates(): HasMany
    {
        return $this->hasMany(PositionSalaryComponent::class);
    }
}