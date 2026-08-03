<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use RuntimeException;

class Payslip extends Model
{
    use SoftDeletes;

    protected $fillable = [

        'payroll_period_id',

        'employee_id',

        'department_id',

        'office_location_id',

        'month',

        'year',

        'gross_earning',

        'total_deduction',

        'net_salary',

        'status',

        'file_pdf',

        'published_by',

        'published_at',

        'unpublish_reason',

        // Snapshot buat PDF recovery (opsi B) - dibekukan SEKALI saat
        // publish, supaya PDF bisa di-generate ulang 100% identik
        // walau file hilang, TANPA bergantung ke CompanySetting/Employee
        // yang datanya bisa saja sudah berubah belakangan.
        'company_name_snapshot',

        'company_address_snapshot',

        'company_phone_snapshot',

        'company_email_snapshot',

        'employee_name_snapshot',

        'employee_code_snapshot',

        'pdf_generated_at',

    ];

    protected function casts(): array
    {
        return [

            'gross_earning' => 'decimal:2',

            'total_deduction' => 'decimal:2',

            'net_salary' => 'decimal:2',

            'published_at' => 'datetime:Y-m-d H:i:s',

            'pdf_generated_at' => 'datetime:Y-m-d H:i:s',

        ];
    }

    /**
     * Immutability guard:
     * 1. Setelah status Published, HANYA transisi resmi unpublish()
     *    (status->Draft + unpublish_reason + file_pdf) yang diizinkan.
     *    Field lain (net_salary, employee_id, snapshot, dll) tidak
     *    bisa diubah lewat jalur manapun, termasuk manggil ->update()
     *    langsung dari controller/service/tinker lain.
     * 2. Hard delete diblokir SELAMANYA - dokumen finansial tidak
     *    boleh hilang permanen dari sistem.
     */
    protected static function booted(): void
    {
        static::forceDeleting(function () {
            throw new RuntimeException('Payslip tidak boleh dihapus permanen. Gunakan soft delete untuk kebutuhan audit.');
        });

        static::updating(function (self $payslip) {

            if ($payslip->getOriginal('status') === 'Published') {

                $allowedDuringUnpublish = ['status', 'unpublish_reason', 'file_pdf', 'updated_at'];
                $dirtyKeys = array_keys($payslip->getDirty());
                $disallowed = array_diff($dirtyKeys, $allowedDuringUnpublish);

                $isLegitimateUnpublish = empty($disallowed) && $payslip->status === 'Draft';

                if (!$isLegitimateUnpublish) {
                    throw new RuntimeException('Slip gaji yang sudah Published bersifat immutable. Harus di-unpublish resmi dulu (dengan alasan) sebelum bisa direvisi.');
                }

                return;
            }

            // Payslip masih Draft (belum pernah Published). Kalau ini
            // transisi ke Published (proses publish resmi), izinkan -
            // terlepas dari status periode induknya.
            $isPublishTransition = $payslip->isDirty('status') && $payslip->status === 'Published';

            if ($isPublishTransition) {
                return;
            }

            // Selain itu (edit nominal/komponen/dll): kalau periode induk
            // lagi Submitted/Approved (proses approval berjalan), payslip
            // TERKUNCI - gak boleh ada perubahan angka diam-diam di
            // tengah approval. Harus reject periode dulu (balik ke Draft)
            // baru bisa direvisi.
            $period = $payslip->payrollPeriod;

            if ($period && in_array($period->status, ['Submitted', 'Approved'])) {
                throw new RuntimeException('Slip gaji ini terkunci - periode payroll-nya sedang dalam proses approval (' . $period->status . '). Reject periode ini dulu (kembali ke Draft) untuk bisa merevisi.');
            }
        });

        static::deleting(function (self $payslip) {

            if (!$payslip->isForceDeleting() && $payslip->status === 'Published') {
                throw new RuntimeException('Payslip yang sudah Published tidak boleh dihapus. Unpublish dulu (dengan alasan resmi) jika benar-benar perlu dihapus.');
            }
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Relationship
    |--------------------------------------------------------------------------
    */

    public function payrollPeriod(): BelongsTo
    {
        return $this->belongsTo(PayrollPeriod::class);
    }

    /**
     * SNAPSHOT departemen saat payslip dibuat - bukan departemen
     * employee saat ini. Kalau employee pindah departemen bulan
     * depan, payslip bulan ini tetap nunjukin departemen lamanya.
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class)->withTrashed();
    }

    public function officeLocation(): BelongsTo
    {
        return $this->belongsTo(OfficeLocation::class)->withTrashed();
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class)->withTrashed();
    }

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'published_by')->withTrashed();
    }

    public function items(): HasMany
    {
        return $this->hasMany(PayslipItem::class);
    }
}