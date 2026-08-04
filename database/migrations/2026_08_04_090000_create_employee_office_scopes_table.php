<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Role vs Scope dipisah total:
     * - Role (Employee.role_id) = APA yang boleh dilakukan (fungsi)
     * - Scope (tabel ini) = DI CABANG MANA dia berwenang
     *
     * employee.office_location_id TETAP berarti kantor asal/tempat
     * kerja - TIDAK dipakai lagi sebagai dasar wewenang approval
     * branch-restricted. Satu-satunya sumber kebenaran wewenang
     * adalah tabel ini.
     */
    public function up(): void
    {
        Schema::create('employee_office_scopes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('employee_id')
                ->constrained('employees')
                ->cascadeOnDelete();

            $table->foreignId('office_location_id')
                ->constrained('office_locations')
                ->cascadeOnDelete();

            $table->foreignId('granted_by')
                ->nullable()
                ->constrained('employees')
                ->nullOnDelete();

            $table->timestamps();

            $table->unique(['employee_id', 'office_location_id'], 'employee_office_scope_unique');
        });

        // Backfill - tiap employee yang punya office_location_id otomatis
        // dikasih 1 scope default sesuai kantor asalnya SEKARANG. Ini
        // yang bikin seluruh approval branch-restricted yang sudah
        // berjalan TETAP jalan tanpa HRD harus isi manual satu-satu.
        // HRD tinggal TAMBAH scope lain di atas ini (misal Manager
        // Kaltim ditambah scope ke semua cabang Kaltim).
        $now = now();

        $rows = DB::table('employees')
            ->whereNotNull('office_location_id')
            ->whereNull('deleted_at')
            ->get(['id', 'office_location_id']);

        foreach ($rows as $employee) {
            DB::table('employee_office_scopes')->insertOrIgnore([
                'employee_id' => $employee->id,
                'office_location_id' => $employee->office_location_id,
                'granted_by' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_office_scopes');
    }
};
