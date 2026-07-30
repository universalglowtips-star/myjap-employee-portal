<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class AttendanceLocationPolicy extends Model
{
    protected $fillable = [

        'position_id',

        'scope_type',

    ];

    public function position(): BelongsTo
    {
        return $this->belongsTo(Position::class);
    }

    public function offices(): BelongsToMany
    {
        return $this->belongsToMany(
            OfficeLocation::class,
            'attendance_location_policy_offices'
        );
    }
}
