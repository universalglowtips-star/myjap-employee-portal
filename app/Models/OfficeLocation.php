<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class OfficeLocation extends Model
{
    use SoftDeletes;

    protected $fillable = [

        'office_code',

        'office_name',

        'latitude',

        'longitude',

        'radius_meter',

        'check_in_start',

        'check_in_end',

        'check_out_start',

        'check_out_end',

        'description',

        'is_active'

    ];

    /*
    |--------------------------------------------------------------------------
    | Relationship
    |--------------------------------------------------------------------------
    */

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    /**
     * Employee yang jadi supervisor buat cabang ini (scope SUPERVISED_BRANCHES)
     */
    public function supervisors(): BelongsToMany
    {
        return $this->belongsToMany(Employee::class, 'office_location_supervisors')->withTrashed();
    }

}