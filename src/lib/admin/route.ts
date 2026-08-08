import { NextResponse } from "next/server";
import { AdminAccessError, assertAdminPermission, createSupabaseAdminClient, requireAdmin, type AdminPermission } from "@/lib/supabase/admin";

export async function requireAdminPermission(permission: AdminPermission) {
  const admin = await requireAdmin();
  assertAdminPermission(admin, permission);
  return { admin, client: createSupabaseAdminClient() };
}

export function adminRouteError(error: unknown) {
  if (error instanceof AdminAccessError) {
    return NextResponse.json({ error: error.status === 401 ? "ورود لازم است." : "برای این عملیات دسترسی نداری." }, { status: error.status });
  }
  console.error("Admin route failed", error);
  return NextResponse.json({ error: "عملیات مدیریتی انجام نشد." }, { status: 500 });
}
