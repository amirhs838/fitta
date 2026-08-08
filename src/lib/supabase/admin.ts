import "server-only";

import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const adminRoles = ["super_admin", "admin", "support"] as const;
export type AdminRole = (typeof adminRoles)[number];

export const adminPermissions = [
  "read_overview",
  "read_users",
  "manage_users",
  "view_body_photos",
  "manage_foods",
  "manage_meals",
  "read_ai_usage",
  "manage_notifications",
  "manage_system_flags",
  "manage_admin_users",
  "read_audit_log",
] as const;
export type AdminPermission = (typeof adminPermissions)[number];

const rolePermissions: Record<AdminRole, readonly AdminPermission[]> = {
  super_admin: adminPermissions,
  admin: [
    "read_overview",
    "read_users",
    "manage_users",
    "view_body_photos",
    "manage_foods",
    "manage_meals",
    "read_ai_usage",
    "manage_notifications",
  ],
  support: ["read_overview", "read_users"],
};

export class AdminAccessError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AdminAccessError";
  }
}

export function isAdminRole(value: unknown): value is AdminRole {
  return (
    typeof value === "string" &&
    (adminRoles as readonly string[]).includes(value)
  );
}

export function hasAdminPermission(
  role: AdminRole,
  permission: AdminPermission,
) {
  return rolePermissions[role].includes(permission);
}

export function assertAdminPermission(
  admin: AdminIdentity,
  permission: AdminPermission,
) {
  if (!hasAdminPermission(admin.role, permission)) {
    throw new AdminAccessError(
      "You do not have permission for this action.",
      403,
    );
  }
}

/** Creates a server-only Supabase client that bypasses RLS using the service-role key. */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase service-role environment variables are not configured.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export type AdminIdentity = {
  userId: string;
  role: AdminRole;
};

/**
 * Requires a verified server-side Supabase session and then resolves its role using
 * the service-role client. This is the authorization boundary for admin handlers.
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const sessionClient = await createServerSupabaseClient();
  const {
    data: { user },
    error: sessionError,
  } = await sessionClient.auth.getUser();

  if (sessionError || !user) {
    throw new AdminAccessError("Authentication is required.", 401);
  }

  const adminClient = createSupabaseAdminClient();
  const { data: adminUser, error: roleError } = await adminClient
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError) {
    throw new Error(`Unable to resolve admin role: ${roleError.message}`);
  }

  if (!adminUser || !isAdminRole(adminUser.role)) {
    throw new AdminAccessError("Administrator access is required.", 403);
  }

  return { userId: user.id, role: adminUser.role };
}
