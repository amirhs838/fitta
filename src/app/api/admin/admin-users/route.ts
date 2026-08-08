import { NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { adminRouteError, requireAdminPermission } from "@/lib/admin/route";
import { isAdminRole } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { client } = await requireAdminPermission("manage_admin_users");
    const [{ data: roles, error }, users] = await Promise.all([client.from("admin_users").select("user_id, role, created_at").order("created_at"), client.auth.admin.listUsers({ page: 1, perPage: 1000 })]);
    if (error || users.error) throw error ?? users.error;
    const emails = new Map(users.data.users.map((user) => [user.id, user.email ?? ""]));
    return NextResponse.json({ admins: (roles ?? []).map((role) => ({ ...role, email: emails.get(role.user_id) ?? "" })) });
  } catch (error) { return adminRouteError(error); }
}

export async function PUT(request: Request) {
  try {
    const { admin, client } = await requireAdminPermission("manage_admin_users");
    const body = await request.json() as { userId?: string; role?: string };
    if (!body.userId || !isAdminRole(body.role)) return NextResponse.json({ error: "شناسه و نقش معتبر لازم است." }, { status: 400 });
    const { error } = await client.from("admin_users").upsert({ user_id: body.userId, role: body.role }, { onConflict: "user_id" });
    if (error) throw error;
    await writeAdminAuditLog(admin, { action: "set_admin_role", targetType: "admin_role", targetId: body.userId, metadata: { role: body.role } });
    return NextResponse.json({ success: true });
  } catch (error) { return adminRouteError(error); }
}
