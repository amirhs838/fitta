import { NextResponse } from "next/server";
import { buildDietPlan, type DietPlanContent } from "@/lib/diet/build-plan";
import { type Goal } from "@/lib/nutrition/calorie-target";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function asPlanContent(value: unknown): DietPlanContent | null {
  if (!value || typeof value !== "object") return null;
  const content = value as Partial<DietPlanContent>;
  return content.version === 1 && typeof content.title === "string" && typeof content.dailyCalories === "number" && Array.isArray(content.meals) ? content as DietPlanContent : null;
}

async function getAuthenticatedClient() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user, error };
}

export async function GET() {
  try {
    const { supabase, user, error } = await getAuthenticatedClient();
    if (error || !user) return NextResponse.json({ error: "برای دیدن برنامه وارد حسابت شو." }, { status: 401 });

    const [{ data: plan, error: planError }, { data: profile, error: profileError }] = await Promise.all([
      supabase.from("diet_plans").select("id, content, generated_at").eq("is_active", true).order("generated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("profiles").select("medical_conditions, daily_calorie_target, goal").eq("id", user.id).maybeSingle(),
    ]);
    if (planError || profileError) return NextResponse.json({ error: "بارگذاری برنامه انجام نشد." }, { status: 500 });

    return NextResponse.json({
      plan: plan ? { id: plan.id, content: asPlanContent(plan.content), generatedAt: plan.generated_at } : null,
      medicalConditions: profile?.medical_conditions ?? [],
      profileReady: Boolean(profile?.daily_calorie_target && profile?.goal),
    });
  } catch {
    return NextResponse.json({ error: "تنظیمات اتصال به سرویس کامل نیست." }, { status: 503 });
  }
}

export async function POST() {
  try {
    const { supabase, user, error } = await getAuthenticatedClient();
    if (error || !user) return NextResponse.json({ error: "برای ساخت برنامه وارد حسابت شو." }, { status: 401 });

    const [{ data: profile, error: profileError }, { count, error: countError }] = await Promise.all([
      supabase.from("profiles").select("daily_calorie_target, goal").eq("id", user.id).maybeSingle(),
      supabase.from("diet_plans").select("id", { count: "exact", head: true }),
    ]);
    if (profileError || countError) return NextResponse.json({ error: "داده‌های لازم برای ساخت برنامه در دسترس نیست." }, { status: 500 });
    if (!profile?.daily_calorie_target || !profile.goal) return NextResponse.json({ error: "اول پروفایل و هدف کالری‌ات را کامل کن." }, { status: 422 });

    const content = buildDietPlan({ dailyCalories: Number(profile.daily_calorie_target), goal: profile.goal as Goal, variant: count ?? 0 });
    const { error: deactivateError } = await supabase.from("diet_plans").update({ is_active: false }).eq("is_active", true);
    if (deactivateError) return NextResponse.json({ error: "ساخت برنامه انجام نشد." }, { status: 500 });

    const { data: plan, error: insertError } = await supabase.from("diet_plans").insert({ user_id: user.id, content, is_active: true }).select("id, generated_at").single();
    if (insertError || !plan) return NextResponse.json({ error: "ذخیرهٔ برنامه انجام نشد." }, { status: 500 });

    return NextResponse.json({ plan: { id: plan.id, content, generatedAt: plan.generated_at } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "تنظیمات اتصال به سرویس کامل نیست." }, { status: 503 });
  }
}
