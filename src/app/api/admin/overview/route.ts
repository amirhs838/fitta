import { NextResponse } from "next/server";
import { adminRouteError, requireAdminPermission } from "@/lib/admin/route";

function dayKey(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export async function GET() {
  try {
    const { client } = await requireAdminPermission("read_overview");
    const now = Date.now();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [users, todayMeals, allRecentMeals, recentProfiles, usage, flags] =
      await Promise.all([
        client.from("profiles").select("id", { count: "exact", head: true }),
        client
          .from("meal_logs")
          .select("id", { count: "exact", head: true })
          .gte("logged_at", dayAgo),
        client
          .from("meal_logs")
          .select("user_id, total_calories, logged_at")
          .gte("logged_at", monthAgo),
        client
          .from("profiles")
          .select("created_at")
          .gte("created_at", monthAgo),
        client
          .from("ai_usage_logs")
          .select("feature, estimated_cost_usd, created_at")
          .gte("created_at", monthAgo),
        client
          .from("system_flags")
          .select("enabled, value")
          .eq("key", "ai_cost_alert")
          .maybeSingle(),
      ]);
    if (
      users.error ||
      todayMeals.error ||
      allRecentMeals.error ||
      recentProfiles.error ||
      usage.error ||
      flags.error
    )
      throw new Error("Unable to load overview metrics");

    const dayUsers = new Set(
      (allRecentMeals.data ?? [])
        .filter((item) => item.logged_at >= dayAgo)
        .map((item) => item.user_id),
    );
    const weekUsers = new Set(
      (allRecentMeals.data ?? [])
        .filter((item) => item.logged_at >= weekAgo)
        .map((item) => item.user_id),
    );
    const monthUsers = new Set(
      (allRecentMeals.data ?? []).map((item) => item.user_id),
    );
    const caloriesByUser = new Map<string, number>();
    for (const meal of allRecentMeals.data ?? [])
      caloriesByUser.set(
        meal.user_id,
        (caloriesByUser.get(meal.user_id) ?? 0) + Number(meal.total_calories),
      );
    const userGrowth = new Map<string, number>();
    for (const profile of recentProfiles.data ?? [])
      userGrowth.set(
        dayKey(profile.created_at),
        (userGrowth.get(dayKey(profile.created_at)) ?? 0) + 1,
      );
    const aiByDay = new Map<
      string,
      {
        cost: number;
        meal_photo: number;
        body_photo: number;
        diet_plan: number;
      }
    >();
    for (const row of usage.data ?? []) {
      const key = dayKey(row.created_at);
      const item = aiByDay.get(key) ?? {
        cost: 0,
        meal_photo: 0,
        body_photo: 0,
        diet_plan: 0,
      };
      item.cost += Number(row.estimated_cost_usd ?? 0);
      const feature = row.feature as string;
      if (
        feature === "meal_photo" ||
        feature === "body_photo" ||
        feature === "diet_plan"
      )
        item[feature] += 1;
      aiByDay.set(key, item);
    }

    const monthlyAiCost = Array.from(aiByDay.values()).reduce(
      (sum, item) => sum + item.cost,
      0,
    );
    const alertValue = flags.data?.value as
      { monthlyUsd?: unknown } | undefined;
    const monthlyLimit =
      typeof alertValue?.monthlyUsd === "number" ? alertValue.monthlyUsd : 0;

    return NextResponse.json({
      costAlert: {
        monthlyAiCost,
        monthlyLimit,
        exceeded: Boolean(
          flags.data?.enabled &&
          monthlyLimit > 0 &&
          monthlyAiCost >= monthlyLimit,
        ),
      },
      kpis: {
        totalUsers: users.count ?? 0,
        dau: dayUsers.size,
        wau: weekUsers.size,
        mau: monthUsers.size,
        mealsToday: todayMeals.count ?? 0,
        averageCaloriesPerActiveUser: monthUsers.size
          ? Math.round(
              Array.from(caloriesByUser.values()).reduce(
                (sum, value) => sum + value,
                0,
              ) / monthUsers.size,
            )
          : 0,
      },
      userGrowth: Array.from(userGrowth, ([date, users]) => ({ date, users })),
      aiUsage: Array.from(aiByDay, ([date, value]) => ({ date, ...value })),
    });
  } catch (error) {
    return adminRouteError(error);
  }
}
