<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Request as RequestFacade;

class AuditLogService
{
    /**
     * Catat 1 baris audit log untuk model yang beneran ada instance-nya.
     * Dipanggil dari controller manapun, untuk model manapun (polymorphic)
     * - tidak perlu bikin tabel audit terpisah tiap modul baru.
     *
     * Contoh: AuditLogService::log($leave, 'approved', $old, $new, auth()->id());
     */
    public static function log(
        Model $auditable,
        string $action,
        ?array $oldValues,
        ?array $newValues,
        ?int $changedBy,
        ?string $description = null
    ): AuditLog {
        return self::logCustom(
            get_class($auditable),
            $auditable->getKey(),
            $action,
            $oldValues,
            $newValues,
            $changedBy,
            $description
        );
    }

    /**
     * Catat audit log tanpa perlu instance model - dipakai buat kasus
     * kayak failed login (email gak ketemu di database sama sekali,
     * jadi gak ada Employee instance yang bisa di-attach).
     */
    public static function logCustom(
        string $auditableType,
        ?int $auditableId,
        string $action,
        ?array $oldValues,
        ?array $newValues,
        ?int $changedBy,
        ?string $description = null
    ): AuditLog {
        return AuditLog::create([
            'auditable_type' => $auditableType,
            'auditable_id' => $auditableId,
            'action' => $action,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'changed_by' => $changedBy,
            'ip_address' => RequestFacade::ip(),
            'source' => RequestFacade::header('X-App-Source'),
            'user_agent' => RequestFacade::header('User-Agent'),
            'description' => $description,
        ]);
    }
}
