import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** The public entry point is intentionally limited to login or the app. */
export default async function Home() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    redirect("/login");
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/dashboard" : "/login");
  } catch {
    redirect("/login");
  }
}
