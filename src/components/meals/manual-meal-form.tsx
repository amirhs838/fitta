"use client";

import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Camera,
  ChevronDown,
  CirclePlus,
  ImagePlus,
  LoaderCircle,
  Plus,
  Trash2,
  Utensils,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { compressMealImage } from "@/lib/image-client";
import { captureMealPhoto, isNativeApp } from "@/lib/native/camera";
import {
  mealTypeLabels,
  mealTypes,
  type MealItem,
  type MealItemInput,
  type MealLog,
  type MealType,
} from "@/lib/meals";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 0,
});
type LocalMealItem = MealItem & { localId: string };

type AnalysisItem = MealItemInput & { source: "ai_estimate" | "local_db" };

function dateTimeLocalValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function createItem(item?: MealItemInput): LocalMealItem {
  return {
    localId: crypto.randomUUID(),
    id: "",
    name: item?.name ?? "",
    quantity: item?.quantity ?? "",
    calories: item?.calories ?? 0,
    proteinG: item?.proteinG ?? 0,
    carbsG: item?.carbsG ?? 0,
    fatG: item?.fatG ?? 0,
    source: item?.source ?? "user_edited",
  };
}

async function fetchTodayMeals(): Promise<MealLog[]> {
  const response = await fetch("/api/meals");
  const payload = (await response.json()) as {
    meals?: MealLog[];
    error?: string;
  };
  if (!response.ok)
    throw new Error(payload.error ?? "بارگذاری وعده‌ها انجام نشد.");
  return payload.meals ?? [];
}

export function ManualMealForm() {
  const queryClient = useQueryClient();
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [loggedAt, setLoggedAt] = useState(dateTimeLocalValue);
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<LocalMealItem[]>([createItem()]);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isNativeCamera, setIsNativeCamera] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsNativeCamera(isNativeApp()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const {
    data: meals = [],
    error: mealsError,
    isLoading,
  } = useQuery({
    queryKey: ["today-meals"],
    queryFn: fetchTodayMeals,
    enabled: isSupabaseConfigured,
  });

  const totals = useMemo(
    () =>
      items.reduce(
        (sum, item) => ({
          calories:
            sum.calories + (Number.isFinite(item.calories) ? item.calories : 0),
          proteinG:
            sum.proteinG + (Number.isFinite(item.proteinG) ? item.proteinG : 0),
          carbsG: sum.carbsG + (Number.isFinite(item.carbsG) ? item.carbsG : 0),
          fatG: sum.fatG + (Number.isFinite(item.fatG) ? item.fatG : 0),
        }),
        { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      ),
    [items],
  );

  const analyzeMeal = useMutation({
    mutationFn: async () => {
      if (!imageData) throw new Error("اول یک عکس از وعده انتخاب کن.");
      const response = await fetch("/api/meals/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData, description }),
      });
      const payload = (await response.json()) as {
        items?: AnalysisItem[];
        error?: string;
      };
      if (!response.ok || !payload.items?.length)
        throw new Error(
          payload.error ??
            "تشخیص خودکار غذا این بار جواب نداد؛ می‌تونی دستی ثبتش کنی.",
        );
      return payload.items;
    },
    onSuccess: (result) => {
      setItems(result.map((item) => createItem(item)));
      setFormError(null);
    },
    onError: (error) =>
      setFormError(
        error instanceof Error
          ? error.message
          : "تشخیص خودکار غذا این بار جواب نداد؛ می‌تونی دستی ثبتش کنی.",
      ),
  });

  const saveMeal = useMutation({
    mutationFn: async () => {
      const cleanItems: MealItemInput[] = items.map(
        ({ name, quantity, calories, proteinG, carbsG, fatG, source }) => ({
          name: name.trim(),
          quantity: quantity?.trim(),
          calories: Number(calories),
          proteinG: Number(proteinG),
          carbsG: Number(carbsG),
          fatG: Number(fatG),
          source,
        }),
      );
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealType,
          loggedAt: new Date(loggedAt).toISOString(),
          userDescription: description,
          imageData,
          items: cleanItems,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "ثبت وعده انجام نشد.");
    },
    onSuccess: async () => {
      setItems([createItem()]);
      setDescription("");
      setImageData(null);
      setLoggedAt(dateTimeLocalValue());
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["today-meals"] });
    },
    onError: (error) =>
      setFormError(
        error instanceof Error ? error.message : "ثبت وعده انجام نشد.",
      ),
  });

  async function handleImageSelect(file?: File) {
    if (!file) return;
    setFormError(null);
    try {
      setImageData(await compressMealImage(file));
    } catch (error) {
      setImageData(null);
      setFormError(
        error instanceof Error ? error.message : "آماده‌سازی عکس انجام نشد.",
      );
    }
  }

  async function takeNativePhoto() {
    setFormError(null);
    setIsTakingPhoto(true);
    try {
      setImageData(await captureMealPhoto());
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "دریافت عکس از دوربین انجام نشد؛ دوباره تلاش کن.",
      );
    } finally {
      setIsTakingPhoto(false);
    }
  }

  function updateItem(
    localId: string,
    field: keyof MealItemInput,
    value: string,
  ) {
    setItems((current) =>
      current.map((item) => {
        if (item.localId !== localId) return item;
        if (field === "name" || field === "quantity")
          return { ...item, [field]: value, source: "user_edited" };
        return { ...item, [field]: Number(value), source: "user_edited" };
      }),
    );
  }

  function submit() {
    setFormError(null);
    const hasInvalidItem = items.some(
      (item) =>
        !item.name.trim() ||
        [item.calories, item.proteinG, item.carbsG, item.fatG].some(
          (value) => !Number.isFinite(value) || value < 0,
        ),
    );
    if (hasInvalidItem) {
      setFormError("برای هر آیتم نام غذا و عددهای معتبر وارد کن.");
      return;
    }
    saveMeal.mutate();
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <div>
            <Link
              className="rounded-lg text-sm font-semibold text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
              href="/"
            >
              فیتا
            </Link>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">
              ثبت وعده
            </h1>
            <p className="mt-1 text-sm text-ink/65">
              عکس بگیر یا دستی وارد کن؛ انتخاب با خودت است.
            </p>
          </div>
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-saffron text-ink">
            <Utensils className="size-5" aria-hidden />
          </div>
        </header>

        {!isSupabaseConfigured && (
          <Card className="mt-6 border-barberry/30 bg-barberry/5 p-4 text-sm leading-7 text-barberry">
            برای فعال‌شدن ثبت وعده، ابتدا مقادیر Supabase را در فایل{" "}
            <code dir="ltr">.env.local</code> وارد کن.
          </Card>
        )}

        <Card className="mt-6 overflow-hidden p-4 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold">تحلیل از روی عکس</h2>
              <p className="mt-1 text-sm leading-7 text-ink/65">
                عکس پیش از ارسال تا حداکثر ۱۰۲۴ پیکسل فشرده می‌شود.
              </p>
            </div>
            <Camera className="size-5 shrink-0 text-forest" aria-hidden />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <label className="flex min-h-28 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-mist bg-paper p-3 transition-colors hover:border-forest focus-within:ring-2 focus-within:ring-forest">
              {imageData ? (
                <div className="relative w-full">
                  <Image
                    className="h-32 w-full rounded-xl object-cover"
                    src={imageData}
                    alt="پیش‌نمایش عکس وعده"
                    width={1024}
                    height={512}
                    unoptimized
                  />
                  <button
                    className="absolute left-2 top-2 grid size-8 place-items-center rounded-lg bg-surface text-ink shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      setImageData(null);
                    }}
                    aria-label="حذف عکس"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              ) : (
                <span className="flex flex-col items-center gap-2 text-sm font-medium text-ink/65">
                  <ImagePlus className="size-6 text-forest" aria-hidden />
                  عکس غذا را انتخاب کن
                </span>
              )}
              <input
                className="sr-only"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                type="file"
                onChange={(event) =>
                  void handleImageSelect(event.target.files?.[0])
                }
              />
            </label>
            <Button
              className="w-full sm:w-auto"
              disabled={
                !isSupabaseConfigured || !imageData || analyzeMeal.isPending
              }
              onClick={() => analyzeMeal.mutate()}
            >
              {analyzeMeal.isPending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <WandSparkles className="size-4" aria-hidden />
              )}
              {analyzeMeal.isPending ? "در حال تحلیل" : "تحلیل عکس"}
            </Button>
          </div>
          {isNativeCamera && (
            <Button
              className="mt-3"
              variant="secondary"
              disabled={isTakingPhoto}
              onClick={() => void takeNativePhoto()}
            >
              {isTakingPhoto ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Camera className="size-4" aria-hidden />
              )}
              {isTakingPhoto ? "در حال بازکردن دوربین" : "با دوربین عکس بگیر"}
            </Button>
          )}
          {analyzeMeal.isPending && (
            <div
              className="mt-4 h-16 animate-pulse rounded-2xl bg-mist/65"
              aria-label="در حال تحلیل عکس"
            />
          )}
          <p className="mt-3 text-xs font-light leading-6 text-ink/55">
            خروجی هوش مصنوعی فقط یک تخمین است؛ قبل از ثبت، آیتم‌ها و مقدارها را
            خودت تأیید یا اصلاح کن.
          </p>
        </Card>

        <Card className="mt-5 p-4 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label
              className="block space-y-2 text-sm font-medium"
              htmlFor="meal-type"
            >
              <span>نوع وعده</span>
              <div className="relative">
                <select
                  id="meal-type"
                  className="h-12 w-full appearance-none rounded-xl border border-mist bg-surface px-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
                  value={mealType}
                  onChange={(event) =>
                    setMealType(event.target.value as MealType)
                  }
                >
                  {mealTypes.map((type) => (
                    <option key={type} value={type}>
                      {mealTypeLabels[type]}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute left-3 top-3.5 size-5 text-ink/55"
                  aria-hidden
                />
              </div>
            </label>
            <label
              className="block space-y-2 text-sm font-medium"
              htmlFor="logged-at"
            >
              <span>زمان ثبت</span>
              <div className="relative">
                <Input
                  id="logged-at"
                  type="datetime-local"
                  value={loggedAt}
                  onChange={(event) => setLoggedAt(event.target.value)}
                />
                <CalendarClock
                  className="pointer-events-none absolute left-3 top-3.5 size-5 text-ink/55"
                  aria-hidden
                />
              </div>
            </label>
          </div>
          <label
            className="mt-5 block space-y-2 text-sm font-medium"
            htmlFor="description"
          >
            <span>
              یادداشت کوتاه{" "}
              <span className="font-light text-ink/50">(اختیاری)</span>
            </span>
            <Input
              id="description"
              maxLength={500}
              placeholder="مثلاً برنج کمی بیشتر از حد معمول بود"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <div className="mt-7 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-extrabold">آیتم‌های وعده</h2>
            <p className="text-xs font-light text-ink/55">
              کالری تخمینی — لطفاً در صورت نیاز اصلاح کنید
            </p>
          </div>
          <div className="mt-3 space-y-3">
            {items.map((item, index) => (
              <div
                className="rounded-2xl border border-mist bg-paper p-3 sm:p-4"
                key={item.localId}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">
                    آیتم {numberFormatter.format(index + 1)}
                  </p>
                  {items.length > 1 && (
                    <button
                      className="grid size-10 place-items-center rounded-xl text-barberry hover:bg-barberry/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-barberry"
                      type="button"
                      onClick={() =>
                        setItems((current) =>
                          current.filter(
                            (currentItem) =>
                              currentItem.localId !== item.localId,
                          ),
                        )
                      }
                      aria-label={`حذف آیتم ${index + 1}`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input
                    aria-label="نام غذا"
                    placeholder="نام غذا"
                    value={item.name}
                    onChange={(event) =>
                      updateItem(item.localId, "name", event.target.value)
                    }
                  />
                  <Input
                    aria-label="مقدار یا حجم"
                    placeholder="مقدار، مثلاً ۱ پرس"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(item.localId, "quantity", event.target.value)
                    }
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <NumberInput
                    label="کالری"
                    value={item.calories}
                    onChange={(value) =>
                      updateItem(item.localId, "calories", value)
                    }
                  />
                  <NumberInput
                    label="پروتئین (گرم)"
                    value={item.proteinG}
                    onChange={(value) =>
                      updateItem(item.localId, "proteinG", value)
                    }
                  />
                  <NumberInput
                    label="کربوهیدرات (گرم)"
                    value={item.carbsG}
                    onChange={(value) =>
                      updateItem(item.localId, "carbsG", value)
                    }
                  />
                  <NumberInput
                    label="چربی (گرم)"
                    value={item.fatG}
                    onChange={(value) =>
                      updateItem(item.localId, "fatG", value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => setItems((current) => [...current, createItem()])}
          >
            <CirclePlus className="size-4" aria-hidden /> افزودن آیتم
          </Button>

          <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-forest p-4 text-surface sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-light text-surface/70">جمع این وعده</p>
              <p className="mt-1 text-2xl font-extrabold">
                {numberFormatter.format(totals.calories)}{" "}
                <span className="text-sm font-medium">کالری</span>
              </p>
              <p className="mt-1 text-xs text-surface/75">
                پروتئین {numberFormatter.format(totals.proteinG)} · کربوهیدرات{" "}
                {numberFormatter.format(totals.carbsG)} · چربی{" "}
                {numberFormatter.format(totals.fatG)} گرم
              </p>
            </div>
            <Button
              className="min-w-36"
              variant="accent"
              disabled={!isSupabaseConfigured || saveMeal.isPending}
              onClick={submit}
            >
              {saveMeal.isPending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4" aria-hidden />
              )}
              {saveMeal.isPending ? "در حال ثبت" : "ثبت وعده"}
            </Button>
          </div>
          {formError && (
            <p
              className="mt-4 rounded-xl bg-barberry/10 px-3 py-2 text-sm text-barberry"
              role="alert"
            >
              {formError}
            </p>
          )}
        </Card>

        <section className="mt-8 pb-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-extrabold">وعده‌های امروز</h2>
            <span className="text-xs font-light text-ink/55">
              {numberFormatter.format(meals.length)} وعده
            </span>
          </div>
          {isLoading ? (
            <div className="mt-4 space-y-3">
              <div className="h-28 animate-pulse rounded-2xl bg-mist/65" />
              <div className="h-28 animate-pulse rounded-2xl bg-mist/65" />
            </div>
          ) : mealsError ? (
            <Card className="mt-4 p-5 text-sm leading-7 text-barberry">
              {mealsError.message}{" "}
              <Link className="font-semibold underline" href="/login">
                ورود به حساب
              </Link>
            </Card>
          ) : meals.length === 0 ? (
            <Card className="mt-4 p-6 text-center">
              <p className="text-base font-bold">امروز هنوز چیزی ثبت نشده</p>
              <p className="mt-2 text-sm text-ink/65">
                صبحونه چی داشتی؟ از فرم بالا شروع کن.
              </p>
            </Card>
          ) : (
            <div className="mt-4 space-y-3">
              {meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1 text-xs font-light text-ink/65">
      <span>{label}</span>
      <Input
        min="0"
        step="0.1"
        type="number"
        value={Number.isNaN(value) ? "" : value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function MealCard({ meal }: { meal: MealLog }) {
  const time = new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tehran",
  }).format(new Date(meal.loggedAt));
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold">
            {mealTypeLabels[meal.mealType]}
          </p>
          <p className="mt-1 text-xs font-light text-ink/55">
            {time} · {meal.items.map((item) => item.name).join("، ")}
          </p>
        </div>
        <p className="text-lg font-extrabold text-forest">
          {numberFormatter.format(meal.totalCalories)}{" "}
          <span className="text-xs font-medium">کالری</span>
        </p>
      </div>
      <p className="mt-3 border-t border-mist pt-3 text-xs text-ink/65">
        پروتئین {numberFormatter.format(meal.totalProteinG)} · کربوهیدرات{" "}
        {numberFormatter.format(meal.totalCarbsG)} · چربی{" "}
        {numberFormatter.format(meal.totalFatG)} گرم
      </p>
    </Card>
  );
}
