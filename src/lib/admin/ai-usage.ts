import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Best-effort operational telemetry; it never blocks a user-facing AI response. */
export async function logAiUsage({ userId, feature, status = "success" }: { userId: string; feature: "meal_photo" | "body_photo" | "diet_plan"; status?: "success" | "error" }) {
  try {
    const { error } = await createSupabaseAdminClient().from("ai_usage_logs").insert({
      user_id: userId,
      feature,
      provider: process.env.AI_PROVIDER ?? "unknown",
      model: process.env.AI_MODEL ?? "default",
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      estimated_cost_usd: 0,
      status,
    });
    if (error) console.error("Unable to write AI usage log", error);
  } catch (error) {
    console.error("Unable to initialize AI usage logging", error);
  }
}
