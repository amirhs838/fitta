import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Camera, ChartNoAxesCombined, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const highlights = [
  {
    icon: Camera,
    title: "ثبت راحت وعده",
    description: "با عکس یا ثبت دستی، غذای امروزت را سریع اضافه کن.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "روند قابل‌فهم",
    description: "مصرف و عادت‌هایت را روزبه‌روز دنبال کن.",
  },
  {
    icon: Sparkles,
    title: "پیشنهاد شخصی",
    description: "هدف روزانه‌ات را با اطلاعات خودت تنظیم کن.",
  },
];

export default async function Home() {
  let isSignedIn = false;
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      isSignedIn = Boolean(user);
    } catch {
      // The public landing page remains available if Supabase is temporarily unavailable.
    }
  }
  if (isSignedIn) redirect("/dashboard");

  return (
    <main className="min-h-screen overflow-hidden bg-paper">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          className="flex items-center gap-2 rounded-lg text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          href="/"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-forest text-lg font-extrabold text-surface">
            ف
          </span>
          <span className="text-xl font-extrabold tracking-tight">فیتا</span>
        </Link>
        <Link
          className="text-sm font-semibold text-forest underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          href="/login"
        >
          ورود به حساب
        </Link>
      </header>

      <section className="relative mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-16 lg:py-24">
        <div className="relative z-10">
          <span className="inline-flex rounded-full bg-forest/10 px-3 py-1.5 text-xs font-semibold text-forest">
            همراه کوچکِ عادت‌های بهتر
          </span>
          <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.35] tracking-tight text-ink sm:text-5xl">
            با غذایت مهربان‌تر و آگاهانه‌تر پیش برو.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-ink/70 sm:text-lg">
            فیتا کمک می‌کند وعده‌هایت را ثبت کنی، روند روزهایت را ببینی و با یک
            هدف واقع‌بینانه جلو بروی.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest px-4 text-sm font-semibold text-surface shadow-button transition-colors hover:bg-forest/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:w-auto"
              href="/register"
            >
              شروع کن <ArrowLeft className="size-4" aria-hidden />
            </Link>
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-mist bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:w-auto"
              href="/dashboard"
            >
              دیدن داشبورد
            </Link>
          </div>
          <p className="mt-4 text-xs font-light text-ink/55">
            بدون قضاوت؛ فقط برای شناخت بهتر عادت‌های خودت.
          </p>
        </div>

        <Card className="relative overflow-hidden p-5 sm:p-7">
          <div className="absolute -left-16 -top-16 size-40 rounded-full bg-saffron/25 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-light tracking-wide text-ink/55">
                امروز، یک قدم کوچک
              </p>
              <p className="mt-1 text-lg font-extrabold">ثبت وعده‌ی اول</p>
            </div>
            <div className="grid size-12 place-items-center rounded-2xl bg-saffron text-ink">
              <Camera className="size-5" aria-hidden />
            </div>
          </div>
          <div className="mt-8 rounded-2xl border border-mist bg-paper p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">هدف امروز</span>
              <span className="font-extrabold text-forest">۱۸۰۰ کالری</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-mist">
              <div className="h-full w-[42%] rounded-full bg-saffron" />
            </div>
            <p className="mt-3 text-xs font-light text-ink/60">
              بعد از تکمیل پروفایل، هدف مخصوص خودت را می‌سازی.
            </p>
          </div>
        </Card>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-3 px-5 pb-12 sm:grid-cols-3 sm:px-8">
        {highlights.map(({ icon: Icon, title, description }) => (
          <Card className="p-5" key={title}>
            <Icon className="size-5 text-forest" aria-hidden />
            <h2 className="mt-4 text-base font-extrabold">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-ink/65">{description}</p>
          </Card>
        ))}
      </section>
    </main>
  );
}
