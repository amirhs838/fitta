import { NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { adminRouteError, requireAdminPermission } from "@/lib/admin/route";

function normalize(value: string) { return value.toLowerCase().replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/‌/g, " ").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim(); }
function number(value: unknown, min = 0, max = 100_000) { return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null; }
function foodPayload(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 160) : "";
  const calories = number(body.caloriesPer100g);
  const protein = number(body.proteinGPer100g);
  const carbs = number(body.carbsGPer100g);
  const fat = number(body.fatGPer100g);
  const fiber = body.fiberGPer100g === null || body.fiberGPer100g === undefined || body.fiberGPer100g === "" ? null : number(body.fiberGPer100g);
  const serving = body.servingSizeG === null || body.servingSizeG === undefined || body.servingSizeG === "" ? null : number(body.servingSizeG, 0.1);
  const aliases = Array.isArray(body.aliases) ? body.aliases.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 160)).filter(Boolean).slice(0, 20) : [];
  const category = typeof body.category === "string" ? body.category.trim().slice(0, 80) : null;
  if (!name || calories === null || protein === null || carbs === null || fat === null || fiber === null && !(body.fiberGPer100g === null || body.fiberGPer100g === undefined || body.fiberGPer100g === "") || serving === null && !(body.servingSizeG === null || body.servingSizeG === undefined || body.servingSizeG === "")) return null;
  return { name, normalized_name: normalize(name), aliases, category, serving_size_g: serving, calories_per_100g: calories, protein_g_per_100g: protein, carbs_g_per_100g: carbs, fat_g_per_100g: fat, fiber_g_per_100g: fiber, is_active: body.isActive !== false };
}

export async function GET(request: Request) {
  try {
    const { client } = await requireAdminPermission("manage_foods");
    const params = new URL(request.url).searchParams;
    if (params.get("report") === "unmatched") {
      const { data, error } = await client.from("meal_items").select("name").eq("source", "ai_estimate").limit(5000);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const item of data ?? []) counts.set(item.name, (counts.get(item.name) ?? 0) + 1);
      return NextResponse.json({ foods: Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 100) });
    }
    const query = params.get("q")?.trim() ?? "";
    let builder = client.from("foods").select("*").order("updated_at", { ascending: false }).limit(250);
    if (query) builder = builder.or(`name.ilike.%${query}%,normalized_name.ilike.%${normalize(query)}%`);
    const { data, error } = await builder;
    if (error) throw error;
    return NextResponse.json({ foods: data ?? [] });
  } catch (error) { return adminRouteError(error); }
}

export async function POST(request: Request) {
  try {
    const { admin, client } = await requireAdminPermission("manage_foods");
    const payload = foodPayload(await request.json() as Record<string, unknown>);
    if (!payload) return NextResponse.json({ error: "اطلاعات غذا معتبر نیست." }, { status: 400 });
    const { data, error } = await client.from("foods").insert(payload).select("id").single();
    if (error || !data) return NextResponse.json({ error: "ذخیرهٔ غذا انجام نشد؛ نام یکتا باید باشد." }, { status: 400 });
    await writeAdminAuditLog(admin, { action: "create_food", targetType: "food", targetId: data.id });
    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) { return adminRouteError(error); }
}

export async function PUT(request: Request) {
  try {
    const { admin, client } = await requireAdminPermission("manage_foods");
    const body = await request.json() as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    const payload = foodPayload(body);
    if (!id || !payload) return NextResponse.json({ error: "اطلاعات غذا معتبر نیست." }, { status: 400 });
    const { error } = await client.from("foods").update(payload).eq("id", id);
    if (error) return NextResponse.json({ error: "ویرایش غذا انجام نشد." }, { status: 400 });
    await writeAdminAuditLog(admin, { action: "edit_food", targetType: "food", targetId: id });
    return NextResponse.json({ success: true });
  } catch (error) { return adminRouteError(error); }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "شناسهٔ غذا لازم است." }, { status: 400 });
    const { admin, client } = await requireAdminPermission("manage_foods");
    const { error } = await client.from("foods").delete().eq("id", id);
    if (error) throw error;
    await writeAdminAuditLog(admin, { action: "delete_food", targetType: "food", targetId: id });
    return NextResponse.json({ success: true });
  } catch (error) { return adminRouteError(error); }
}
