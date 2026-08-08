import { NextResponse } from "next/server";
import { parseImageDataUrl } from "@/lib/ai/image-data";
import {
  mealTypes,
  type MealItemInput,
  type MealItemSource,
  type MealType,
} from "@/lib/meals";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_ITEMS = 20;
const MAX_VALUE = 100_000;
const validSources = new Set<MealItemSource>([
  "ai_estimate",
  "local_db",
  "user_edited",
]);

function numberInRange(value: unknown, min = 0, max = MAX_VALUE) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
    ? value
    : null;
}

function parseMealItem(value: unknown): MealItemInput | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const name = typeof item.name === "string" ? item.name.trim() : "";
  const calories = numberInRange(item.calories);
  const proteinG = numberInRange(item.proteinG);
  const carbsG = numberInRange(item.carbsG);
  const fatG = numberInRange(item.fatG);
  const quantity =
    typeof item.quantity === "string"
      ? item.quantity.trim().slice(0, 80)
      : undefined;
  const source =
    typeof item.source === "string" &&
    validSources.has(item.source as MealItemSource)
      ? (item.source as MealItemSource)
      : "user_edited";

  if (
    !name ||
    name.length > 120 ||
    calories === null ||
    proteinG === null ||
    carbsG === null ||
    fatG === null
  )
    return null;
  return { name, calories, proteinG, carbsG, fatG, quantity, source };
}

async function getAuthenticatedClient() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { supabase, user, error };
}

export async function GET() {
  try {
    const { supabase, user, error } = await getAuthenticatedClient();
    if (error || !user)
      return NextResponse.json(
        { error: "برای دیدن وعده‌ها وارد حسابت شو." },
        { status: 401 },
      );

    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data, error: queryError } = await supabase
      .from("meal_logs")
      .select(
        "id, meal_type, total_calories, total_protein_g, total_carbs_g, total_fat_g, logged_at, meal_items(id, name, quantity, calories, protein_g, carbs_g, fat_g, source)",
      )
      .gte("logged_at", since)
      .order("logged_at", { ascending: false });

    if (queryError)
      return NextResponse.json(
        { error: "بارگذاری وعده‌ها انجام نشد." },
        { status: 500 },
      );

    const tehranDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tehran",
    }).format(new Date());
    const meals = (data ?? [])
      .filter(
        (meal) =>
          new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(
            new Date(meal.logged_at),
          ) === tehranDate,
      )
      .map((meal) => ({
        id: meal.id,
        mealType: meal.meal_type,
        totalCalories: Number(meal.total_calories),
        totalProteinG: Number(meal.total_protein_g),
        totalCarbsG: Number(meal.total_carbs_g),
        totalFatG: Number(meal.total_fat_g),
        loggedAt: meal.logged_at,
        items: meal.meal_items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity ?? undefined,
          calories: Number(item.calories),
          proteinG: Number(item.protein_g),
          carbsG: Number(item.carbs_g),
          fatG: Number(item.fat_g),
          source: item.source,
        })),
      }));

    return NextResponse.json({ meals });
  } catch {
    return NextResponse.json(
      { error: "تنظیمات اتصال به سرویس کامل نیست." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, error } = await getAuthenticatedClient();
    if (error || !user)
      return NextResponse.json(
        { error: "برای ثبت وعده وارد حسابت شو." },
        { status: 401 },
      );

    const body = (await request.json()) as Record<string, unknown>;
    const mealType = body.mealType;
    const items = Array.isArray(body.items)
      ? body.items.map(parseMealItem)
      : [];
    const loggedAt =
      typeof body.loggedAt === "string" ? new Date(body.loggedAt) : null;
    const userDescription =
      typeof body.userDescription === "string"
        ? body.userDescription.trim().slice(0, 500)
        : null;

    if (
      !mealTypes.includes(mealType as MealType) ||
      !loggedAt ||
      Number.isNaN(loggedAt.getTime()) ||
      !items.length ||
      items.length > MAX_ITEMS ||
      items.some((item) => !item)
    ) {
      return NextResponse.json(
        { error: "اطلاعات وعده کامل یا معتبر نیست." },
        { status: 400 },
      );
    }

    const validItems = items as MealItemInput[];
    const totals = validItems.reduce(
      (sum, item) => ({
        calories: sum.calories + item.calories,
        proteinG: sum.proteinG + item.proteinG,
        carbsG: sum.carbsG + item.carbsG,
        fatG: sum.fatG + item.fatG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );

    let photoPath: string | null = null;
    if (body.imageData) {
      let image;
      try {
        image = parseImageDataUrl(body.imageData);
      } catch {
        return NextResponse.json(
          {
            error:
              "فایل عکس معتبر نیست یا پس از فشرده‌سازی بزرگ‌تر از ۲ مگابایت است.",
          },
          { status: 400 },
        );
      }

      const extension =
        image.mimeType === "image/jpeg" ? "jpg" : image.mimeType.split("/")[1];
      photoPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("meal-photos")
        .upload(photoPath, image.bytes, {
          contentType: image.mimeType,
          upsert: false,
        });
      if (uploadError)
        return NextResponse.json(
          {
            error:
              "بارگذاری عکس وعده انجام نشد. از تنظیم bucket یا اتصال مطمئن شو.",
          },
          { status: 500 },
        );
    }

    const { data: meal, error: mealError } = await supabase
      .from("meal_logs")
      .insert({
        user_id: user.id,
        meal_type: mealType,
        photo_url: photoPath,
        user_description: userDescription || null,
        total_calories: totals.calories,
        total_protein_g: totals.proteinG,
        total_carbs_g: totals.carbsG,
        total_fat_g: totals.fatG,
        logged_at: loggedAt.toISOString(),
      })
      .select("id")
      .single();

    if (mealError || !meal) {
      if (photoPath)
        await supabase.storage.from("meal-photos").remove([photoPath]);
      return NextResponse.json(
        { error: "ذخیرهٔ وعده انجام نشد. دوباره تلاش کن." },
        { status: 500 },
      );
    }

    const { error: itemsError } = await supabase.from("meal_items").insert(
      validItems.map((item) => ({
        meal_log_id: meal.id,
        name: item.name,
        quantity: item.quantity || null,
        calories: item.calories,
        protein_g: item.proteinG,
        carbs_g: item.carbsG,
        fat_g: item.fatG,
        source: item.source ?? "user_edited",
      })),
    );

    if (itemsError) {
      await supabase.from("meal_logs").delete().eq("id", meal.id);
      if (photoPath)
        await supabase.storage.from("meal-photos").remove([photoPath]);
      return NextResponse.json(
        { error: "ذخیرهٔ آیتم‌های وعده انجام نشد. دوباره تلاش کن." },
        { status: 500 },
      );
    }

    return NextResponse.json({ id: meal.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "تنظیمات اتصال به سرویس کامل نیست." },
      { status: 503 },
    );
  }
}
