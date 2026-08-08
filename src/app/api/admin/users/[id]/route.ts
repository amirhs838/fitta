import { NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { adminRouteError, requireAdminPermission } from "@/lib/admin/route";

async function removeFolder(
  client: ReturnType<
    typeof import("@/lib/supabase/admin").createSupabaseAdminClient
  >,
  bucket: string,
  prefix: string,
) {
  const { data, error } = await client.storage
    .from(bucket)
    .list(prefix, { limit: 1000 });
  if (error) throw error;
  const paths = (data ?? [])
    .filter((entry) => entry.name)
    .map((entry) => `${prefix}/${entry.name}`);
  if (paths.length) {
    const { error: removeError } = await client.storage
      .from(bucket)
      .remove(paths);
    if (removeError) throw removeError;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { client } = await requireAdminPermission("read_users");
    const [
      { data: profile, error: profileError },
      { data: weights },
      { data: meals },
      { data: plans },
      { data: bodyPhotos },
      authResult,
    ] = await Promise.all([
      client
        .from("profiles")
        .select(
          "id, full_name, gender, birth_date, height_cm, activity_level, goal, medical_conditions, daily_calorie_target, created_at",
        )
        .eq("id", id)
        .maybeSingle(),
      client
        .from("weight_logs")
        .select("weight_kg, logged_at")
        .eq("user_id", id)
        .order("logged_at", { ascending: false })
        .limit(60),
      client
        .from("meal_logs")
        .select("id, meal_type, total_calories, logged_at")
        .eq("user_id", id)
        .order("logged_at", { ascending: false })
        .limit(50),
      client
        .from("diet_plans")
        .select("id, content, is_active, generated_at")
        .eq("user_id", id)
        .order("generated_at", { ascending: false })
        .limit(10),
      client
        .from("body_photos")
        .select("id, taken_at")
        .eq("user_id", id)
        .order("taken_at", { ascending: false }),
      client.auth.admin.getUserById(id),
    ]);
    if (profileError || !profile || authResult.error)
      return NextResponse.json({ error: "کاربر پیدا نشد." }, { status: 404 });
    return NextResponse.json({
      profile: {
        ...profile,
        height_cm:
          profile.height_cm === null ? null : Number(profile.height_cm),
        daily_calorie_target:
          profile.daily_calorie_target === null
            ? null
            : Number(profile.daily_calorie_target),
        email: authResult.data.user.email ?? "",
        suspended: Boolean(
          authResult.data.user.banned_until &&
          new Date(authResult.data.user.banned_until).getTime() > Date.now(),
        ),
      },
      weights: (weights ?? []).map((item) => ({
        ...item,
        weight_kg: Number(item.weight_kg),
      })),
      meals: (meals ?? []).map((item) => ({
        ...item,
        total_calories: Number(item.total_calories),
      })),
      plans,
      bodyPhotos: bodyPhotos ?? [],
    });
  } catch (error) {
    return adminRouteError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { admin, client } = await requireAdminPermission("manage_users");
    if (id === admin.userId)
      return NextResponse.json(
        { error: "نمی‌توانی حساب خودت را از این بخش تغییر دهی." },
        { status: 400 },
      );
    const body = (await request.json()) as { action?: string };
    if (body.action !== "suspend" && body.action !== "activate")
      return NextResponse.json(
        { error: "عملیات نامعتبر است." },
        { status: 400 },
      );
    const { error } = await client.auth.admin.updateUserById(id, {
      ban_duration: body.action === "suspend" ? "876000h" : "none",
    });
    if (error) throw error;
    await writeAdminAuditLog(admin, {
      action: body.action === "suspend" ? "suspend_user" : "activate_user",
      targetType: "user",
      targetId: id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return adminRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { admin, client } = await requireAdminPermission("manage_users");
    if (id === admin.userId)
      return NextResponse.json(
        { error: "نمی‌توانی حساب خودت را حذف کنی." },
        { status: 400 },
      );
    await removeFolder(client, "meal-photos", id);
    await removeFolder(client, "body-photos", id);
    const { error } = await client.auth.admin.deleteUser(id);
    if (error) throw error;
    await writeAdminAuditLog(admin, {
      action: "delete_user",
      targetType: "user",
      targetId: id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return adminRouteError(error);
  }
}
