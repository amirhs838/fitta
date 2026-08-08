import { NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { adminRouteError, requireAdminPermission } from "@/lib/admin/route";

export async function POST(request: Request) {
  try {
    const { admin, client } = await requireAdminPermission("manage_notifications");
    const body = await request.json() as { title?: string; message?: string; target?: string; type?: "info" | "success" | "warning" | "error" };
    const title = body.title?.trim().slice(0, 160) ?? "";
    const message = body.message?.trim().slice(0, 2000) ?? "";
    const target = body.target?.trim() ?? "";
    if (!title || !message || !target) return NextResponse.json({ error: "عنوان، پیام و مخاطب لازم است." }, { status: 400 });

    let recipientIds: string[] = [];
    if (target === "all" || target === "inactive_7d") {
      const [{ data: profiles, error: profilesError }, { data: recentMeals, error: mealsError }] = await Promise.all([
        client.from("profiles").select("id"),
        target === "inactive_7d" ? client.from("meal_logs").select("user_id").gte("logged_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) : Promise.resolve({ data: [], error: null }),
      ]);
      if (profilesError || mealsError) throw new Error("Unable to resolve notification recipients");
      const activeUsers = new Set((recentMeals ?? []).map((item) => item.user_id));
      recipientIds = (profiles ?? []).map((profile) => profile.id).filter((id) => target === "all" || !activeUsers.has(id));
    } else {
      recipientIds = [target];
    }
    if (!recipientIds.length) return NextResponse.json({ error: "کاربری برای این اعلان پیدا نشد." }, { status: 400 });

    const { error } = await client.from("app_notifications").insert(recipientIds.map((userId) => ({ user_id: userId, type: body.type ?? "info", title, body: message })));
    if (error) throw error;
    await writeAdminAuditLog(admin, { action: "send_notification", targetType: "notification", metadata: { target, recipients: recipientIds.length } });
    return NextResponse.json({ recipients: recipientIds.length }, { status: 201 });
  } catch (error) { return adminRouteError(error); }
}
