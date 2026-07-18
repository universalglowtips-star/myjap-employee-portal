<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OfficeLocation extends Model
{
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

}