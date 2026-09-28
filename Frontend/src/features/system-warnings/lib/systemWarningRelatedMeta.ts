import type { SystemWarning } from '../../../api/types/systemWarning'

interface RelatedMeta {
  label: string
  path: string
}

/**
 * related_type (FQCN penuh) -> path tujuan + field yang dipakai sebagai
 * label link, dari data `related` yang di-eager-load backend. Cuma
 * SATU type yang pernah dipakai sekarang (App\Models\PayrollPeriod,
 * dikonfirmasi Fase 1) - TAPI kolom ini genuinely polymorphic, gak
 * boleh diasumsikan selamanya cuma PayrollPeriod. Pola defensive SAMA
 * PERSIS getNotificationTargetPath() (notificationTypeMeta.ts): type
 * gak dikenal / related null / field label hilang -> null (gak ada
 * link), BUKAN error/crash.
 */
export function getSystemWarningRelatedMeta(warning: SystemWarning): RelatedMeta | null {
  if (!warning.related_type || !warning.related_id || !warning.related) return null

  switch (warning.related_type) {
    case 'App\\Models\\PayrollPeriod': {
      const periodCode = warning.related.period_code
      if (typeof periodCode !== 'string') return null
      return { label: periodCode, path: `/payroll/periods/${warning.related_id}` }
    }
    default:
      return null
  }
}
