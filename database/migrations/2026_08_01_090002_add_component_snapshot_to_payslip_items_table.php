<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Snapshot nama/kode/tipe komponen SAAT payslip_item dibuat.
     * Ini yang bikin slip historis immutable: kalau nanti HRD rename
     * "Tunjangan Kebersihan" jadi "Tunjangan Sanitasi", atau ubah
     * salary_components.type dari earning ke deduction, slip yang
     * SUDAH dibuat tetap menampilkan nama & tipe aslinya - tidak
     * berubah retroaktif.
     *
     * salary_component_id tetap dipertahankan (buat referensi/filter),
     * tapi sumber kebenaran tampilan slip adalah kolom snapshot ini.
     */
    public function up(): void
    {
        Schema::table('payslip_items', function (Blueprint $table) {

            $table->string('component_code', 20)->nullable()->after('salary_component_id');

            $table->string('component_name', 100)->nullable()->after('component_code');

            $table->string('component_type', 20)->nullable()->after('component_name');
            // earning / deduction - disalin dari salary_components.type saat itu
        });
    }

    public function down(): void
    {
        Schema::table('payslip_items', function (Blueprint $table) {
            $table->dropColumn(['component_code', 'component_name', 'component_type']);
        });
    }
};
