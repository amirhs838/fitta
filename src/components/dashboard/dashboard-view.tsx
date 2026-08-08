"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Bell, Coffee, Cookie, Salad, Soup, UserRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DayHorizon } from "@/components/dashboard/day-horizon";
import { InAppNotifications } from "@/components/notifications/in-app-notifications";
import { mealTypeLabels, type MealType } from "@/lib/meals";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type TrendDay = {
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};
type TrendResponse = {
  range: number;
  targetCalories: number;
  targetIsDefault: boolean;
  trend: TrendDay[];
  today: TrendDay;
  todayMeals: Array<{ mealType: MealType; loggedAt: string; calories: number }>;
  mealBreakdown: Record<MealType, number>;
};

const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 0,
});

async function fetchTrends(range: number): Promise<TrendResponse> {
  const response = await fetch(`/api/trends?range=${range}`);
  const payload = (await response.json()) as TrendResponse & { error?: string };
  if (!response.ok)
    throw new Error(payload.error ?? "بارگذاری داشبورد انجام نشد.");
  return payload;
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tehran",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function DashboardView() {
  const [range, setRange] = useState(7);
  const reduceMotion = useReducedMotion();
  const { data, error, isLoading } = useQuery({
    queryKey: ["trends", range],
    queryFn: () => fetchTrends(range),
    enabled: isSupabaseConfigured,
  });

  if (!isSupabaseConfigured)
    return (
      <DashboardMessage text="برای دیدن داشبورد، ابتدا مقادیر Supabase را در فایل .env.local وارد کن." />
    );
  if (isLoading) return <DashboardSkeleton />;
  if (error || !data)
    return (
      <DashboardMessage
        text={error?.message ?? "داشبورد در دسترس نیست."}
        login
      />
    );

  const percentage = Math.min(
    100,
    Math.round((data.today.calories / data.targetCalories) * 100),
  );
  const remaining = Math.max(0, data.targetCalories - data.today.calories);
  const macroCards = [
    { label: "پروتئین", value: data.today.proteinG, unit: "گرم", icon: Soup },
    { label: "کربوهیدرات", value: data.today.carbsG, unit: "گرم", icon: Salad },
    { label: "چربی", value: data.today.fatG, unit: "گرم", icon: Cookie },
  ];
  const breakdown = (
    Object.entries(data.mealBreakdown) as Array<[MealType, number]>
  ).map(([mealType, calories]) => ({
    name: mealTypeLabels[mealType],
    calories,
  }));

  return (
    <main className="min-h-screen bg-paper pb-28">
      <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-8 sm:py-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-ink/55">
              امروز، قدم بعدی تو
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              سلام، آماده‌ای؟
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              className="grid size-11 place-items-center rounded-2xl border border-mist bg-surface text-ink transition-colors hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              href="/body-analysis"
              aria-label="تحلیل بدن"
            >
              <Bell className="size-5" aria-hidden />
            </Link>
            <Link
              className="grid size-11 place-items-center rounded-2xl bg-ink text-surface shadow-button transition-colors hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              href="/profile"
              aria-label="پروفایل"
            >
              <UserRound className="size-5" aria-hidden />
            </Link>
          </div>
        </header>
        <InAppNotifications />
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-6"
        >
          <DayHorizon
            meals={data.todayMeals}
            calories={data.today.calories}
            target={data.targetCalories}
          />
        </motion.div>

        <section className="mt-5 grid gap-4 sm:grid-cols-[1.1fr_.9fr]">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink/65">کالری امروز</p>
                <p className="mt-2 text-4xl font-extrabold tracking-tight text-ink">
                  {numberFormatter.format(data.today.calories)}
                </p>
                <p className="mt-1 text-xs font-light text-ink/55">
                  از هدف {numberFormatter.format(data.targetCalories)} کالری
                </p>
              </div>
              <div
                className="dashboard-ring"
                style={
                  {
                    "--progress": `${percentage * 3.6}deg`,
                  } as CSSProperties
                }
              >
                <div className="dashboard-ring-inner">
                  <span className="text-sm font-extrabold text-forest">
                    {percentage}٪
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-5 rounded-xl bg-paper px-3 py-2 text-sm text-ink/70">
              {data.today.calories > data.targetCalories
                ? "از هدفت عبور کردی؛ فردا هم فرصت یک شروع تازه است."
                : `${numberFormatter.format(remaining)} کالری تا هدف امروز باقی مانده.`}
            </p>
            {data.targetIsDefault && (
              <p className="mt-3 text-xs font-light text-ink/55">
                هدف فعلی پیش‌فرض است؛ در تکمیل پروفایل می‌توانی آن را شخصی‌سازی
                کنی.
              </p>
            )}
          </Card>
          <Card className="p-5">
            <p className="text-sm font-medium text-ink/65">تفکیک وعده‌ها</p>
            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={breakdown}
                  layout="vertical"
                  margin={{ top: 0, right: 2, bottom: 0, left: 8 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={68}
                    tick={{ fill: "var(--ink)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--paper)" }}
                    content={<ChartTooltip />}
                  />
                  <Bar
                    dataKey="calories"
                    fill="var(--forest)"
                    radius={[6, 6, 6, 6]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-3">
          {macroCards.map(({ label, value, unit, icon: Icon }, index) => (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.06 }}
              key={label}
            >
              <Card className="h-full p-4">
                <Icon className="size-4 text-forest" aria-hidden />
                <p className="mt-3 text-xs font-light text-ink/60">{label}</p>
                <p className="mt-1 text-lg font-extrabold">
                  {numberFormatter.format(value)}{" "}
                  <span className="text-[10px] font-medium">{unit}</span>
                </p>
              </Card>
            </motion.div>
          ))}
        </section>

        <section className="mt-8" id="trend">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold">روند مصرف</h2>
              <p className="mt-1 text-sm text-ink/65">
                مصرف روزانه‌ات را بدون قضاوت دنبال کن.
              </p>
            </div>
            <div
              className="flex rounded-xl border border-mist bg-surface p-1"
              aria-label="انتخاب بازهٔ نمودار"
            >
              {([7, 30] as const).map((option) => (
                <button
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest ${range === option ? "bg-forest text-surface" : "text-ink/65 hover:bg-paper"}`}
                  key={option}
                  type="button"
                  onClick={() => setRange(option)}
                >
                  {option === 7 ? "۷ روز" : "۳۰ روز"}
                </button>
              ))}
            </div>
          </div>
          <Card className="mt-4 p-4 sm:p-5">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.trend}
                  margin={{ top: 16, right: 6, bottom: 0, left: -18 }}
                >
                  <CartesianGrid
                    stroke="var(--mist)"
                    strokeDasharray="3 5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={dateLabel}
                    tick={{ fill: "var(--ink)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      numberFormatter.format(Number(value))
                    }
                    tick={{ fill: "var(--ink)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="calories"
                    name="کالری"
                    stroke="var(--forest)"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{
                      r: 5,
                      fill: "var(--saffron)",
                      stroke: "var(--surface)",
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-mist bg-surface px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-ink">
        {label && label.includes("-") ? dateLabel(label) : label}
      </p>
      {payload.map((item) => (
        <p className="mt-1 text-forest" key={item.name}>
          {item.name ?? "کالری"}:{" "}
          {numberFormatter.format(Number(item.value ?? 0))} کالری
        </p>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-paper px-4 py-5 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="h-16 w-48 animate-pulse rounded-2xl bg-mist/65" />
        <div className="h-56 animate-pulse rounded-3xl bg-mist/65" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-56 animate-pulse rounded-2xl bg-mist/65" />
          <div className="h-56 animate-pulse rounded-2xl bg-mist/65" />
        </div>
      </div>
    </main>
  );
}

function DashboardMessage({
  text,
  login = false,
}: {
  text: string;
  login?: boolean;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4">
      <Card className="max-w-md p-6 text-center">
        <Coffee className="mx-auto size-6 text-forest" aria-hidden />
        <p className="mt-4 text-base font-extrabold">
          فعلاً داشبورد آماده نیست
        </p>
        <p className="mt-2 text-sm leading-7 text-ink/65">{text}</p>
        {login && (
          <Link
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-forest px-4 text-sm font-semibold text-surface"
            href="/login"
          >
            ورود به حساب
          </Link>
        )}
      </Card>
    </main>
  );
}
