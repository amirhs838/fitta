import { NextResponse } from "next/server";
import { adminRouteError, requireAdminPermission } from "@/lib/admin/route";

export async function GET() {
  try {
    const { client } = await requireAdminPermission("read_audit_log");
    const { data, error } = await client.from("admin_audit_log").select("id, admin_user_id, action, target_type, target_id, metadata, created_at").order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    return NextResponse.json({ entries: data ?? [] });
  } catch (error) { return adminRouteError(error); }
}
