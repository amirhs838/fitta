import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "ورود لازم است." }, { status: 401 });
    const { data, error } = await supabase.from("app_notifications").select("id, type, title, body, read_at, created_at").or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order("created_at", { ascending: false }).limit(10);
    if (error) throw error;
    return NextResponse.json({ notifications: data ?? [] });
  } catch { return NextResponse.json({ error: "بارگذاری اعلان‌ها انجام نشد." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as { id?: string };
    if (!body.id) return NextResponse.json({ error: "شناسهٔ اعلان لازم است." }, { status: 400 });
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "ورود لازم است." }, { status: 401 });
    const { error } = await supabase.from("app_notifications").update({ read_at: new Date().toISOString() }).eq("id", body.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "به‌روزرسانی اعلان انجام نشد." }, { status: 500 }); }
}
