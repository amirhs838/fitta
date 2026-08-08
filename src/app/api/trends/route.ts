import { NextResponse } from "next/server";
import { type MealType } from "@/lib/meals";
import { tehranDateKey, tehranDateKeys } from "@/lib/time";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const validRanges = new Set([7, 30]);
type TrendDay = { date: string; calories: number; proteinG: number; carbsG: number; fatG: number };

export async function GET(request: Request) {
  try {
    const rangeParam = Number(new URL(request.url).searchParams.get("range") ?? 7);
    const range = validRanges.has(rangeParam) ? rangeParam : 7;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "برای دیدن داشبورد وارد حسابت شو." }, { status: 401 });

    const days = tehranDateKeys(range);
    const daySet = new Set(days);
    const since = new Date(Date.now() - (range + 1) * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: logs, error: logsError }, { data: profile }] = await Promise.all([
      supabase.from("meal_logs").select("meal_type, total_calories, total_protein_g, total_carbs_g, total_fat_g, logged_at").gte("logged_at", since).order("logged_at", { ascending: true }),
      supabase.from("profiles").select("daily_calorie_target").eq("id", user.id).maybeSingle(),
    ]);

    if (logsError) return NextResponse.json({ error: "داده‌های روند بارگذاری نشد." }, { status: 500 });

    const trend = new Map<string, TrendDay>(days.map((date) => [date, { date, calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }]));
    const today = tehranDateKey(new Date());
    const todayMeals: Array<{ mealType: MealType; loggedAt: string; calories: number }> = [];
    const mealBreakdown: Record<MealType, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };

    for (const log of logs ?? []) {
      const date = tehranDateKey(log.logged_at);
      if (!daySet.has(date)) continue;
      const current = trend.get(date)!;
      const calories = Number(log.total_calories);
      current.calories += calories;
      current.proteinG += Number(log.total_protein_g);
      current.carbsG += Number(log.total_carbs_g);
      current.fatG += Number(log.total_fat_g);

      if (date === today) {
        const mealType = log.meal_type as MealType;
        mealBreakdown[mealType] += calories;
        todayMeals.push({ mealType, loggedAt: log.logged_at, calories });
      }
    }

    return NextResponse.json({
      range,
      targetCalories: Number(profile?.daily_calorie_target ?? 2000),
      targetIsDefault: !profile?.daily_calorie_target,
      trend: Array.from(trend.values()),
      today: trend.get(today) ?? { date: today, calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      todayMeals,
      mealBreakdown,
    });
  } catch {
    return NextResponse.json({ error: "تنظیمات اتصال به سرویس کامل نیست." }, { status: 503 });
  }
}
