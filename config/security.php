<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Two-Factor Authentication Enforcement (Kill Switch)
    |--------------------------------------------------------------------------
    |
    | Fitur 2FA (TOTP) wajib untuk role SUPER_ADMIN/HRD/FINANCE/DIRECTOR
    | (lihat App\Services\TwoFactorService::REQUIRED_ROLES). Kill switch
    | ini WAJIB ada buat jaga-jaga rollout awal - kalau ada bug dan malah
    | bikin SUPER_ADMIN sendiri (termasuk Bagus) kekunci gak bisa masuk,
    | tinggal set TWO_FACTOR_ENFORCED=false di .env (server production),
    | login balik ke 1 step biasa untuk SEMUA role TANPA perlu rollback
    | kode/deploy ulang. Default true setelah fitur ini stabil.
    |
    */

    'two_factor_enforced' => env('TWO_FACTOR_ENFORCED', true),

];
