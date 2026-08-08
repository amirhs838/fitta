import { NextResponse } from "next/server";
import { adminRouteError, requireAdminPermission } from "@/lib/admin/route";

export async function GET(request: Request) {
  try {
    const { client } = await requireAdminPermission("read_users");
    const search = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
    const [{ data: profiles, error: profilesError }, authResult] = await Promise.all([
      client.from("profiles").select("id, full_name, goal, created_at, daily_calorie_target").order("created_at", { ascending: false }).limit(500),
      client.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (profilesError || authResult.error) throw new Error("Unable to load users");
    const authUsers = new Map(authResult.data.users.map((user) => [user.id, user]));
    const users = (profiles ?? []).map((profile) => {
      const auth = authUsers.get(profile.id);
      return { id: profile.id, fullName: profile.full_name, email: auth?.email ?? "", goal: profile.goal, createdAt: profile.created_at, suspended: Boolean(auth?.banned_until && new Date(auth.banned_until).getTime() > Date.now()), dailyCalorieTarget: profile.daily_calorie_target === null ? null : Number(profile.daily_calorie_target) };
    }).filter((user) => !search || user.fullName?.toLowerCase().includes(search) || user.email.toLowerCase().includes(search));
    return NextResponse.json({ users });
  } catch (error) {
    return adminRouteError(error);
  }
}
