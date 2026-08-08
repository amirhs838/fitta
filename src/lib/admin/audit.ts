import "server-only";

import {
  createSupabaseAdminClient,
  type AdminIdentity,
} from "@/lib/supabase/admin";

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type AdminAuditEntry = {
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: JsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/** Writes an immutable audit record through the server-only service-role client. */
export async function writeAdminAuditLog(
  admin: AdminIdentity,
  entry: AdminAuditEntry,
): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("admin_audit_log")
    .insert({
      admin_user_id: admin.userId,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId ?? null,
      metadata: entry.metadata ?? {},
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
    });

  if (error) {
    throw new Error(`Unable to write admin audit log: ${error.message}`);
  }
}
