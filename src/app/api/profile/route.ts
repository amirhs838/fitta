import { NextResponse } from "next/server";
import { calculateCalorieTarget, type ActivityLevel, type Gender, type Goal } from "@/lib/nutrition/calorie-target";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const genders = new Set<Gender>(["male", "female", "other"]);
const activityLevels = new Set<ActivityLevel>(["sedentary", "light", "moderate", "active", "very_active"]);
const goals = new Set<Goal>(["lose_weight", "gain_weight", "build_muscle", "maintain", "fat_loss"]);
const medicalConditions = new Set(["diabetes_type1", "diabetes_type2", "hypertension", "pregnancy", "other"]);

function numberInRange(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null;
}

async function getAuthenticatedClient() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user, error };
}

export async function GET() {
  try {
    const { supabase, user, error } = await getAuthenticatedClient();
    if (error || !user) return NextResponse.json({ error: "برای دیدن پروفایل وارد حسابت شو." }, { status: 401 });

    const [{ data: profile, error: profileError }, { data: weightLog, error: weightError }] = await Promise.all([
      supabase.from("profiles").select("full_name, gender, birth_date, height_cm, activity_level, goal, medical_conditions, daily_calorie_target").eq("id", user.id).maybeSingle(),
      supabase.from("weight_logs").select("weight_kg, logged_at").order("logged_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (profileError || weightError) return NextResponse.json({ error: "بارگذاری پروفایل انجام نشد." }, { status: 500 });

    return NextResponse.json({
      profile: profile && {
        fullName: profile.full_name ?? "",
        gender: profile.gender ?? "",
        birthDate: profile.birth_date ?? "",
        heightCm: profile.height_cm === null ? "" : Number(profile.height_cm),
        activityLevel: profile.activity_level ?? "",
        goal: profile.goal ?? "",
        medicalConditions: profile.medical_conditions ?? [],
        dailyCalorieTarget: profile.daily_calorie_target === null ? null : Number(profile.daily_calorie_target),
      },
      latestWeight: weightLog ? { weightKg: Number(weightLog.weight_kg), loggedAt: weightLog.logged_at } : null,
    });
  } catch {
    return NextResponse.json({ error: "تنظیمات اتصال به سرویس کامل نیست." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const { supabase, user, error } = await getAuthenticatedClient();
    if (error || !user) return NextResponse.json({ error: "برای ویرایش پروفایل وارد حسابت شو." }, { status: 401 });

    const body = await request.json() as Record<string, unknown>;
    const fullName = typeof body.fullName === "string" ? body.fullName.trim().slice(0, 100) : "";
    const gender = body.gender as Gender;
    const birthDate = typeof body.birthDate === "string" ? body.birthDate : "";
    const heightCm = numberInRange(body.heightCm, 100, 250);
    const weightKg = numberInRange(body.weightKg, 30, 350);
    const activityLevel = body.activityLevel as ActivityLevel;
    const goal = body.goal as Goal;
    const conditions = Array.isArray(body.medicalConditions) ? body.medicalConditions.filter((condition): condition is string => typeof condition === "string" && medicalConditions.has(condition)).slice(0, 5) : [];

    if (!genders.has(gender) || !birthDate || heightCm === null || weightKg === null || !activityLevels.has(activityLevel) || !goals.has(goal)) {
      return NextResponse.json({ error: "همهٔ اطلاعات پایه را با مقدار معتبر وارد کن." }, { status: 400 });
    }

    let result;
    try {
      result = calculateCalorieTarget({ gender, birthDate, heightCm, weightKg, activityLevel, goal });
    } catch {
      return NextResponse.json({ error: "تاریخ تولد واردشده معتبر نیست." }, { status: 400 });
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName || null,
      gender,
      birth_date: birthDate,
      height_cm: heightCm,
      activity_level: activityLevel,
      goal,
      medical_conditions: conditions,
      daily_calorie_target: result.dailyCalories,
    }, { onConflict: "id" });
    if (profileError) return NextResponse.json({ error: "ذخیرهٔ پروفایل انجام نشد." }, { status: 500 });

    const { error: weightError } = await supabase.from("weight_logs").insert({ user_id: user.id, weight_kg: weightKg });
    if (weightError) return NextResponse.json({ error: "پروفایل ذخیره شد، اما ثبت وزن انجام نشد." }, { status: 500 });

    return NextResponse.json({ calorieTarget: result.dailyCalories, bmr: result.bmr, tdee: result.tdee });
  } catch {
    return NextResponse.json({ error: "تنظیمات اتصال به سرویس کامل نیست." }, { status: 503 });
  }
}
