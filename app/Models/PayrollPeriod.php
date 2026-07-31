<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use RuntimeException;

class PayrollPeriod extends Model
{
    use SoftDeletes;

    protected $fillable = [

        'period_code',

        'period_type',

        'period_start',

        'period_end',

        'pay_date',

        'status',

        'locked',

        'published_at',

        'published_by',

        'created_by',

    ];

    protected function casts(): array
    {
        return [

            'period_start' => 'date:Y-m-d',

            'period_end' => 'date:Y-m-d',

            'pay_date' => 'date:Y-m-d',

            'published_at' => 'datetime:Y-m-d H:i:s',

            'locked' => 'boolean',

        ];
    }

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function publisher(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'published_by')->withTrashed();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'created_by')->withTrashed();
    }

    /**
     * Immutability guard:
     * 1. Hard delete SELAMANYA diblokir - satu-satunya cara "hapus"
     *    payroll period adalah soft delete (masih bisa di-restore),
     *    demi kebutuhan audit & referensi operasional jangka panjang.
     * 2. Kalau period sudah locked (biasanya dibarengi Published),
     *    seluruh field-nya jadi read-only - gak ada yang bisa
     *    ngubah apapun lagi, termasuk SUPER_ADMIN lewat kode manapun.
     */
    protected static function booted(): void
    {
        static::forceDeleting(function () {
            throw new RuntimeException('Payroll period tidak boleh dihapus permanen. Gunakan soft delete (masih bisa di-restore) untuk kebutuhan audit.');
        });

        static::updating(function (self $period) {

            if ($period->getOriginal('locked') === true || $period->getOriginal('locked') === 1) {
                throw new RuntimeException('Payroll period ini sudah locked (Published) dan bersifat immutable - tidak bisa diubah lagi.');
            }
        });
    }

    /**
     * Cari periode REGULAR untuk bulan/tahun tertentu, bikin baru
     * kalau belum ada. Dipanggil dari PayslipController supaya
     * request lama (month+year) tetap jalan tanpa perlu klien kirim
     * payroll_period_id secara eksplisit.
     */
    public static function findOrCreateRegular(int $month, int $year, ?int $createdBy = null): self
    {
        $start = \Carbon\Carbon::create($year, $month, 1)->startOfMonth();
        $end = (clone $start)->endOfMonth();
        $code = 'REGULAR-' . $year . '-' . str_pad((string) $month, 2, '0', STR_PAD_LEFT);

        $existing = self::where('period_code', $code)->first();

        if ($existing) {
            return $existing;
        }

        try {

            $period = self::create([
                'period_code' => $code,
                'period_type' => 'REGULAR',
                'period_start' => $start,
                'period_end' => $end,
                'pay_date' => $end,
                'status' => 'Draft',
                'locked' => false,
                'created_by' => $createdBy,
            ]);

        } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {

            // Race condition: request lain sempat bikin period yang sama
            // persis di antara pengecekan di atas dan insert ini. Ambil
            // yang sudah kebuat itu, jangan dianggap error.
            return self::where('period_code', $code)->firstOrFail();
        }

        \App\Services\AuditLogService::log(
            $period,
            'created',
            null,
            $period->only(['period_code', 'period_type', 'status']),
            $createdBy,
            'Payroll period baru dibuat otomatis'
        );

        return $period;
    }
}
