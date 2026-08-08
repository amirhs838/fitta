import { NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { adminRouteError, requireAdminPermission } from "@/lib/admin/route";

export async function GET() {
  try {
    const { client } = await requireAdminPermission("manage_meals");
    const { data, error } = await client.from("meal_logs").select("id, user_id, meal_type, total_calories, user_description, logged_at, created_at").order("created_at", { ascending: false }).limit(300);
    if (error) throw error;
    return NextResponse.json({ meals: (data ?? []).map((meal) => ({ ...meal, total_calories: Number(meal.total_calories) })) });
  } catch (error) { return adminRouteError(error); }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "شناسهٔ وعده لازم است." }, { status: 400 });
    const { admin, client } = await requireAdminPermission("manage_meals");
    const { error } = await client.from("meal_logs").delete().eq("id", id);
    if (error) throw error;
    await writeAdminAuditLog(admin, { action: "delete_meal_log", targetType: "meal_log", targetId: id });
    return NextResponse.json({ success: true });
  } catch (error) { return adminRouteError(error); }
}
