<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Position extends Model
{
    protected $fillable = [

        'position_code',

        'position_name',

        'description',

        'is_active'

    ];

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }
}