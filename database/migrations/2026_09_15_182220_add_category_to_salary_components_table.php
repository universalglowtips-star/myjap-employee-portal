<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Task 15b - redesain struktur Komponen Gaji, hasil diskusi mendalam
     * dengan data rekap gaji Excel asli (Agustus 2026, cabang BCA & BRI).
     * Disetujui eksplisit 2026-09-15.
     *
     * fixed = nominal per karyawan/jabatan, jarang berubah (Gaji Pokok,
     * Insentif Jabatan, dst) - TIDAK dikali apapun tiap periode.
     * scheduled_variable = SELALU dihitung tiap periode tapi nominalnya
     * tarif x jumlah, jumlahnya beda tiap periode (Uang Harian, Bonus DLV).
     * situational = kehadirannya sendiri gak pasti tiap periode (Bonus
     * Lebaran dst), gak punya default tersimpan sama sekali.
     *
     * default_amount/is_required lama SENGAJA TIDAK dihapus (non-destruktif,
     * data payslip_items lama snapshot-based jadi gak kesentuh) - tapi jadi
     * vestigial untuk category fixed/scheduled_variable, nominal
     * sebenarnya pindah ke position_salary_components/
     * employee_salary_components. Untuk category situational, is_required
     * harus selalu false (di-enforce di kode, bukan constraint DB).
     */
    public function up(): void
    {
        Schema::table('salary_components', function (Blueprint $table) {
            $table->enum('category', ['fixed', 'scheduled_variable', 'situational'])
                ->default('fixed')
                ->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('salary_components', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }
};
