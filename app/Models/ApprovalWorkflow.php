<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalWorkflow extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'applies_to_period_type',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function steps(): HasMany
    {
        return $this->hasMany(ApprovalWorkflowStep::class)->orderBy('level');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'created_by')->withTrashed();
    }

    /**
     * Ambil workflow aktif buat 1 period_type. Null berarti period_type
     * ini gak butuh approval sama sekali - submit() langsung skip ke Approved.
     */
    public static function activeFor(string $periodType): ?self
    {
        return self::where('applies_to_period_type', $periodType)
            ->where('is_active', true)
            ->with('steps')
            ->first();
    }
}
