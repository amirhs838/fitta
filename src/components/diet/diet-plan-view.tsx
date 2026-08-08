"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { AlertTriangle, ArrowLeft, ChefHat, HeartPulse, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type DietPlanContent } from "@/lib/diet/build-plan";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type DietResponse = { plan: { id: string; content: DietPlanContent | null; generatedAt: string } | null; medicalConditions: string[]; profileReady: boolean };
const numberFormatter = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

async function fetchPlan(): Promise<DietResponse> {
  const response = await fetch("/api/diet-plan");
  const payload = await response.json() as DietResponse & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "بارگذاری برنامه انجام نشد.");
  return payload;
}

export function DietPlanView() {
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const { data, error, isLoading } = useQuery({ queryKey: ["diet-plan"], queryFn: fetchPlan, enabled: isSupabaseConfigured });
  const generatePlan = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/diet-plan", { method: "POST" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "ساخت برنامه انجام نشد.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diet-plan"] }),
  });

  if (!isSupabaseConfigured) return <DietMessage text="برای ساخت برنامه، ابتدا مقادیر Supabase را در فایل .env.local وارد کن." />;
  if (isLoading) return <DietSkeleton />;
  if (error || !data) return <DietMessage text={error?.message ?? "برنامه در دسترس نیست."} login />;

  const plan = data.plan?.content;
  const medicalWarning = data.medicalConditions.length > 0;
  return (
    <main className="min-h-screen bg-paper px-4 py-5 pb-12 sm:px-8 sm:py-8"><div className="mx-auto w-full max-w-3xl"><header className="flex items-center justify-between gap-4"><div><Link className="rounded-lg text-sm font-semibold text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest" href="/dashboard">داشبورد</Link><h1 className="mt-2 text-3xl font-extrabold tracking-tight">برنامه پیشنهادی</h1><p className="mt-1 text-sm leading-7 text-ink/65">یک نمونهٔ منعطف بر پایهٔ هدف روزانه‌ات و غذاهای آشنا.</p></div><div className="grid size-12 place-items-center rounded-2xl bg-saffron text-ink"><ChefHat className="size-5" aria-hidden /></div></header>
      {medicalWarning && <Card className="mt-6 border-barberry/30 bg-barberry/5 p-4"><div className="flex gap-3"><HeartPulse className="mt-0.5 size-5 shrink-0 text-barberry" aria-hidden /><p className="text-sm leading-7 text-barberry">این پیشنهاد جایگزین مشاوره پزشک یا متخصص تغذیه نیست؛ به‌خصوص برای شرایط پزشکی خاص، حتماً با پزشک خود مشورت کنید.</p></div></Card>}
      {!data.profileReady ? <Card className="mt-6 p-6 text-center"><AlertTriangle className="mx-auto size-6 text-saffron" aria-hidden /><h2 className="mt-4 text-lg font-extrabold">اول هدفت را مشخص کنیم</h2><p className="mt-2 text-sm leading-7 text-ink/65">برای ساخت برنامه، قد، وزن، فعالیت و هدفت را در پروفایل کامل کن.</p><Link className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-forest px-4 text-sm font-semibold text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-paper" href="/profile">تکمیل پروفایل <ArrowLeft className="size-4" aria-hidden /></Link></Card> : !plan ? <Card className="mt-6 p-7 text-center"><Sparkles className="mx-auto size-7 text-forest" aria-hidden /><h2 className="mt-4 text-lg font-extrabold">برای امروز یک برنامه بسازیم؟</h2><p className="mt-2 text-sm leading-7 text-ink/65">یک برنامهٔ نمونه می‌سازیم که می‌توانی با سلیقه و شرایط روزت تنظیمش کنی.</p><Button className="mt-5" disabled={generatePlan.isPending} onClick={() => generatePlan.mutate()}>{generatePlan.isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}{generatePlan.isPending ? "در حال ساخت" : "ساخت برنامه"}</Button>{generatePlan.error && <p className="mt-4 text-sm text-barberry">{generatePlan.error instanceof Error ? generatePlan.error.message : "ساخت برنامه انجام نشد."}</p>}</Card> : <PlanCard plan={plan} generatedAt={data.plan?.generatedAt} reduceMotion={reduceMotion} onNewPlan={() => generatePlan.mutate()} pending={generatePlan.isPending} error={generatePlan.error} />}</div></main>
  );
}

function PlanCard({ plan, generatedAt, reduceMotion, onNewPlan, pending, error }: { plan: DietPlanContent; generatedAt?: string; reduceMotion: boolean | null; onNewPlan: () => void; pending: boolean; error: Error | null }) {
  const macros = [{ label: "پروتئین", value: plan.macroTargets.proteinG }, { label: "کربوهیدرات", value: plan.macroTargets.carbsG }, { label: "چربی", value: plan.macroTargets.fatG }];
  return <><motion.section initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mt-6"><Card className="overflow-hidden"><div className="bg-forest p-5 text-surface"><p className="text-xs font-light text-surface/70">هدف روزانهٔ نمونه</p><h2 className="mt-1 text-2xl font-extrabold">{plan.title}</h2><p className="mt-4 text-4xl font-extrabold">{numberFormatter.format(plan.dailyCalories)} <span className="text-base font-medium">کالری</span></p>{generatedAt && <p className="mt-2 text-xs font-light text-surface/70">آخرین نسخه: {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(generatedAt))}</p>}</div><div className="grid grid-cols-3 gap-px bg-mist">{macros.map((macro) => <div className="bg-surface p-4 text-center" key={macro.label}><p className="text-xs font-light text-ink/60">{macro.label}</p><p className="mt-1 text-lg font-extrabold text-forest">{numberFormatter.format(macro.value)} <span className="text-[10px] font-medium">گرم</span></p></div>)}</div></Card></motion.section><section className="mt-5 space-y-3">{plan.meals.map((meal, index) => <motion.div initial={reduceMotion ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: index * 0.05 }} key={meal.title}><Card className="p-5"><div className="flex items-baseline justify-between gap-3"><h3 className="text-lg font-extrabold">{meal.title}</h3><span className="rounded-full bg-saffron/20 px-2.5 py-1 text-xs font-medium text-ink">{meal.calorieRange}</span></div><ul className="mt-4 space-y-2 text-sm leading-7 text-ink/70">{meal.foods.map((food) => <li className="flex gap-2" key={food}><span className="mt-2 size-1.5 shrink-0 rounded-full bg-forest" />{food}</li>)}</ul></Card></motion.div>)}</section><Card className="mt-5 p-5"><h2 className="text-base font-extrabold">یادآوری‌های کوچک</h2><ul className="mt-3 space-y-2 text-sm leading-7 text-ink/65">{plan.notes.map((note) => <li key={note}>{note}</li>)}</ul></Card><div className="mt-5 flex flex-col gap-3 sm:flex-row"><Button className="sm:grow" variant="secondary" disabled={pending} onClick={onNewPlan}>{pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}{pending ? "در حال ساخت" : "نسخهٔ جایگزین بساز"}</Button><Link className="inline-flex min-h-11 items-center justify-center rounded-xl bg-forest px-4 text-sm font-semibold text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-paper" href="/meals">ثبت وعده <ArrowLeft className="mr-2 size-4" aria-hidden /></Link></div>{error && <p className="mt-4 text-sm text-barberry">{error.message}</p>}</>;
}

function DietSkeleton() { return <main className="min-h-screen bg-paper px-4 py-5 sm:px-8"><div className="mx-auto max-w-3xl space-y-5"><div className="h-20 w-64 animate-pulse rounded-2xl bg-mist/65" /><div className="h-52 animate-pulse rounded-2xl bg-mist/65" /><div className="h-32 animate-pulse rounded-2xl bg-mist/65" /></div></main>; }
function DietMessage({ text, login = false }: { text: string; login?: boolean }) { return <main className="grid min-h-screen place-items-center bg-paper px-4"><Card className="max-w-md p-6 text-center"><ChefHat className="mx-auto size-6 text-forest" aria-hidden /><p className="mt-4 text-base font-extrabold">برنامه آماده نیست</p><p className="mt-2 text-sm leading-7 text-ink/65">{text}</p>{login && <Link className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-forest px-4 text-sm font-semibold text-surface" href="/login">ورود به حساب</Link>}</Card></main>; }
