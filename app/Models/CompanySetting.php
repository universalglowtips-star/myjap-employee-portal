<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanySetting extends Model
{
    protected $fillable = [

        'company_name',

        'address',

        'phone',

        'email',

        'logo',

    ];

    /**
     * Ambil data perusahaan (singleton). Kalau belum pernah diisi sama
     * sekali, bikin default dulu supaya PDF/halaman lain tidak error.
     */
    public static function current(): self
    {
        return self::firstOrCreate(
            ['id' => 1],
            ['company_name' => 'PT JASA ANGKUTAN PUBLIK']
        );
    }
}
