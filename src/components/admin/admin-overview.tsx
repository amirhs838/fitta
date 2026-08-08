"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const number = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
type Overview = {
  costAlert: { monthlyAiCost: number; monthlyLimit: number; exceeded: boolean };
  kpis: {
    totalUsers: number;
    dau: number;
    wau: number;
    mau: number;
    mealsToday: number;
    averageCaloriesPerActiveUser: number;
  };
  userGrowth: Array<{ date: string; users: number }>;
  aiUsage: Array<{
    date: string;
    cost: number;
    meal_photo: number;
    body_photo: number;
    diet_plan: number;
  }>;
};
async function getOverview(): Promise<Overview> {
  const response = await fetch("/api/admin/overview");
  const payload = (await response.json()) as Overview & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "بارگذاری انجام نشد.");
  return payload;
}

export function AdminOverview() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: getOverview,
  });
  if (isLoading)
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            className="h-28 animate-pulse rounded-lg bg-zinc-200"
            key={index}
          />
        ))}
      </div>
    );
  if (error || !data)
    return (
      <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        {error?.message ?? "داده‌ها در دسترس نیستند."}
      </p>
    );
  const cards = [
    ["کل کاربران", data.kpis.totalUsers],
    ["DAU", data.kpis.dau],
    ["WAU", data.kpis.wau],
    ["MAU", data.kpis.mau],
    ["وعده‌های امروز", data.kpis.mealsToday],
    ["میانگین کالری فعال‌ها", data.kpis.averageCaloriesPerActiveUser],
  ];
  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">نمای کلی</h1>
        <p className="mt-1 text-sm text-zinc-600">
          شاخص‌های عملیاتی و روند مصرف AI
        </p>
      </div>
      {data.costAlert.exceeded && (
        <p className="mb-4 rounded-md bg-amber-100 p-3 text-sm text-amber-900">
          هشدار هزینه: مصرف ماهانهٔ AI ($
          {data.costAlert.monthlyAiCost.toFixed(4)}) از سقف $
          {data.costAlert.monthlyLimit.toFixed(2)} عبور کرده است.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => (
          <div
            className="rounded-lg border border-zinc-200 bg-white p-4"
            key={String(label)}
          >
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-bold">
              {number.format(Number(value))}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <ChartCard title="رشد کاربران">
          <LineChart data={data.userGrowth}>
            <XAxis dataKey="date" hide />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="users"
              stroke="#18181b"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartCard>
        <ChartCard title="فراخوانی و هزینهٔ AI">
          <BarChart data={data.aiUsage}>
            <XAxis dataKey="date" hide />
            <YAxis />
            <Tooltip />
            <Bar dataKey="meal_photo" stackId="a" fill="#0f766e" />
            <Bar dataKey="body_photo" stackId="a" fill="#a16207" />
            <Bar dataKey="diet_plan" stackId="a" fill="#7c3aed" />
          </BarChart>
        </ChartCard>
      </div>
      {data.aiUsage.reduce((sum, row) => sum + row.cost, 0) > 0 && (
        <p className="mt-3 text-sm text-zinc-600">
          هزینهٔ تخمینی ۳۰ روز: $
          {data.aiUsage.reduce((sum, row) => sum + row.cost, 0).toFixed(4)}
        </p>
      )}
    </section>
  );
}
function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactElement;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
