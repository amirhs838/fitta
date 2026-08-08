import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function isFeatureEnabled(key: string, fallback = true) {
  try {
    const { data, error } = await createSupabaseAdminClient().from("system_flags").select("enabled").eq("key", key).maybeSingle();
    if (error || !data) return fallback;
    return data.enabled;
  } catch {
    return fallback;
  }
}
