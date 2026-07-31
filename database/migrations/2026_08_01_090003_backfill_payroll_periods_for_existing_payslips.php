<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

return new class extends Migration
{
    /**
     * Backfill data payslip yang sudah ada (opsi A) - bukan menghapus
     * data testing lama, tapi menautkannya ke payroll_period yang
     * dibuat otomatis, plus isi kolom snapshot yang tadinya kosong.
     */
    public function up(): void
    {
        $payslips = DB::table('payslips')->whereNull('payroll_period_id')->get();

        // Kelompokkan per month+year, satu period per kombinasi
        $periodCache = [];

        foreach ($payslips as $payslip) {

            $key = $payslip->month . '-' . $payslip->year;

            if (!isset($periodCache[$key])) {

                $start = Carbon::create($payslip->year, $payslip->month, 1)->startOfMonth();
                $end = (clone $start)->endOfMonth();

                $periodId = DB::table('payroll_periods')->insertGetId([
                    'period_code' => 'REGULAR-' . $payslip->year . '-' . str_pad($payslip->month, 2, '0', STR_PAD_LEFT) . '-LEGACY',
                    'period_type' => 'REGULAR',
                    'period_start' => $start,
                    'period_end' => $end,
                    'pay_date' => $end,
                    // Samain status sama payslip yang paling "maju" di periode itu,
                    // supaya data lama yang sudah Published tidak keliatan
                    // Draft lagi setelah migration ini
                    'status' => $payslip->status === 'Published' ? 'Published' : 'Draft',
                    'locked' => $payslip->status === 'Published',
                    'published_at' => $payslip->status === 'Published' ? now() : null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $periodCache[$key] = $periodId;
            }

            $employee = DB::table('employees')->where('id', $payslip->employee_id)->first();

            $items = DB::table('payslip_items')
                ->join('salary_components', 'payslip_items.salary_component_id', '=', 'salary_components.id')
                ->where('payslip_items.payslip_id', $payslip->id)
                ->select('payslip_items.id', 'payslip_items.amount', 'salary_components.code', 'salary_components.name', 'salary_components.type')
                ->get();

            $grossEarning = 0;
            $totalDeduction = 0;

            foreach ($items as $item) {

                if ($item->type === 'earning') {
                    $grossEarning += $item->amount;
                } else {
                    $totalDeduction += $item->amount;
                }

                // Backfill snapshot kolom di payslip_items
                DB::table('payslip_items')->where('id', $item->id)->update([
                    'component_code' => $item->code,
                    'component_name' => $item->name,
                    'component_type' => $item->type,
                ]);
            }

            DB::table('payslips')->where('id', $payslip->id)->update([
                'payroll_period_id' => $periodCache[$key],
                'department_id' => $employee->department_id ?? null,
                'office_location_id' => $employee->office_location_id ?? null,
                'gross_earning' => $grossEarning,
                'total_deduction' => $totalDeduction,
            ]);
        }

        // Baru pasang unique constraint SETELAH backfill selesai -
        // kalau dipasang di awal migration lain, insert period legacy
        // di atas bisa gagal duluan kalau ternyata ada data yang belum sempat ditaut.
        Schema::table('payslips', function (Blueprint $table) {
            $table->unique(['payroll_period_id', 'employee_id'], 'payslips_period_employee_unique');
        });
    }

    public function down(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->dropUnique('payslips_period_employee_unique');
        });

        // Data backfill sengaja TIDAK di-rollback (biar gak destructive) -
        // kalau perlu rollback total, hapus manual payroll_periods yang
        // period_code-nya berakhiran '-LEGACY'.
    }
};
