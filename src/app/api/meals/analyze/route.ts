import { NextResponse } from "next/server";
import { parseImageDataUrl } from "@/lib/ai/image-data";
import { estimateMealFromImage } from "@/lib/ai/meal-vision";
import { logAiUsage } from "@/lib/admin/ai-usage";
import { matchIranianFood } from "@/lib/nutrition-db/match-food";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return NextResponse.json(
        { error: "برای تحلیل عکس وارد حسابت شو." },
        { status: 401 },
      );

    const body = (await request.json()) as Record<string, unknown>;
    const image = parseImageDataUrl(body.imageData);
    const description =
      typeof body.description === "string"
        ? body.description.trim().slice(0, 500)
        : "";
    const estimates = await estimateMealFromImage({
      imageBase64: image.base64,
      mimeType: image.mimeType,
      description,
    });
    void logAiUsage({ userId: user.id, feature: "meal_photo" });

    const items = estimates.map((estimate) => {
      const localFood = matchIranianFood(estimate.name);
      if (!localFood) return { ...estimate, source: "ai_estimate" as const };
      return {
        name: localFood.name,
        quantity: estimate.quantity || localFood.defaultServing,
        calories: localFood.calories,
        proteinG: localFood.proteinG,
        carbsG: localFood.carbsG,
        fatG: localFood.fatG,
        source: "local_db" as const,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Meal image analysis failed", error);
    return NextResponse.json(
      { error: "تشخیص خودکار غذا این بار جواب نداد؛ می‌تونی دستی ثبتش کنی." },
      { status: 422 },
    );
  }
}
