<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    use SoftDeletes;

    protected $fillable = [

        'role_code',

        'role_name',

        'description',

        'is_active'

    ];

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permissions');
    }

    /**
     * Cek apakah role ini punya permission tertentu.
     * SUPER_ADMIN selalu true (bypass, system owner).
     */
    public function hasPermission(string $permissionCode): bool
    {
        if ($this->role_code === 'SUPER_ADMIN') {
            return true;
        }

        return $this->permissions()->where('permission_code', $permissionCode)->exists();
    }
}