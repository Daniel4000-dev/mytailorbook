import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

interface LogAuditParams {
  shopId: string;
  actorId: string | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  diff?: Record<string, unknown>;
}

/** Best-effort audit trail — a logging failure must never block or fail
 *  the real mutation it's describing. */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('audit_log').insert({
      shop_id: params.shopId,
      actor_id: params.actorId,
      actor_name: params.actorName,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      diff: params.diff ?? null,
    });
  } catch (err) {
    console.error('logAudit failed', err);
  }
}
