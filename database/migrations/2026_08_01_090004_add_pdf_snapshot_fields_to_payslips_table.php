<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Snapshot ini dibekukan SEKALI saat publish() - PDF regenerate
     * (misal karena file hilang, storage rusak, server pindah) SELALU
     * pakai kolom ini, TIDAK PERNAH query ulang ke CompanySetting atau
     * Employee. Jadi walau nama perusahaan/karyawan berubah belakangan,
     * hasil regenerate tetap identik sama versi asli yang di-publish.
     */
    public function up(): void
    {
        Schema::table('payslips', function (Blueprint $table) {

            $table->string('company_name_snapshot')->nullable()->after('file_pdf');
            $table->text('company_address_snapshot')->nullable()->after('company_name_snapshot');
            $table->string('company_phone_snapshot')->nullable()->after('company_address_snapshot');
            $table->string('company_email_snapshot')->nullable()->after('company_phone_snapshot');

            $table->string('employee_name_snapshot')->nullable()->after('company_email_snapshot');
            $table->string('employee_code_snapshot')->nullable()->after('employee_name_snapshot');

            // Timestamp yang dipakai di footer PDF ("digenerate pada...") -
            // dibekukan juga, supaya regenerate tidak menampilkan waktu
            // yang berbeda dari PDF aslinya.
            $table->timestamp('pdf_generated_at')->nullable()->after('employee_code_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropColumn([
                'company_name_snapshot',
                'company_address_snapshot',
                'company_phone_snapshot',
                'company_email_snapshot',
                'employee_name_snapshot',
                'employee_code_snapshot',
                'pdf_generated_at',
            ]);
        });
    }
};
