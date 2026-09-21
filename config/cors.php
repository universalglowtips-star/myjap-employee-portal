<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    /*
    | Audit Keamanan Tahap 1 (B.3) - SEBELUMNYA file ini gak pernah
    | di-publish, jadi diam-diam fallback ke default Laravel ('*') tanpa
    | origin-based access control sama sekali. Whitelist eksplisit cuma
    | origin dev standar (keputusan Bagus) - domain produksi BELUM ada
    | (VPS belum di-deploy), WAJIB ditambah di sini pas Tahap 2 (final
    | gate sebelum deploy), jangan sampai lupa.
    */
    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    /*
    | JANGAN diubah ke true kecuali ada perubahan arsitektur auth yang
    | disengaja - auth aplikasi ini 100% Bearer-token (Authorization
    | header), BUKAN mode cookie Sanctum (EnsureFrontendRequestsAreStateful
    | gak dipakai sama sekali, dikonfirmasi audit). Kombinasi
    | allowed_origins wildcard/luas + supports_credentials true adalah
    | pelanggaran spec CORS sekaligus lubang keamanan nyata.
    */
    'supports_credentials' => false,

];
