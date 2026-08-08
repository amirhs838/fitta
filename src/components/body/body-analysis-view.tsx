"use client";

import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Camera, CheckCircle2, HeartPulse, ImagePlus, LoaderCircle, ShieldCheck, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { compressMealImage } from "@/lib/image-client";
import { type BodyAnalysis } from "@/lib/ai/body-vision";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type BodyPhoto = { id: string; signedUrl: string; analysis: BodyAnalysis | null; takenAt: string };
type BodyResponse = { consentedAt: string | null; isAdult: boolean; photos: BodyPhoto[] };

async function fetchBodyPhotos(): Promise<BodyResponse> {
  const response = await fetch("/api/body-analysis");
  const payload = await response.json() as BodyResponse & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "بارگذاری عکس‌های پیشرفت انجام نشد.");
  return payload;
}

export function BodyAnalysisView() {
  const queryClient = useQueryClient();
  const [imageData, setImageData] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { data, error, isLoading } = useQuery({ queryKey: ["body-analysis"], queryFn: fetchBodyPhotos, enabled: isSupabaseConfigured });
  const analyze = useMutation({
    mutationFn: async () => {
      if (!imageData) throw new Error("اول یک عکس انتخاب کن.");
      if (!consent) throw new Error("برای ادامه باید رضایت آگاهانه را تأیید کنی.");
      const response = await fetch("/api/body-analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageData, consent }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "تحلیل عکس انجام نشد.");
    },
    onSuccess: async () => { setImageData(null); setConsent(false); setMessage(null); await queryClient.invalidateQueries({ queryKey: ["body-analysis"] }); },
    onError: (mutationError) => setMessage(mutationError instanceof Error ? mutationError.message : "تحلیل عکس انجام نشد."),
  });
  const deletePhoto = useMutation({
    mutationFn: async (id: string) => { const response = await fetch(`/api/body-analysis?id=${id}`, { method: "DELETE" }); const payload = await response.json() as { error?: string }; if (!response.ok) throw new Error(payload.error ?? "حذف عکس انجام نشد."); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["body-analysis"] }),
  });

  async function chooseImage(file?: File) { if (!file) return; setMessage(null); try { setImageData(await compressMealImage(file)); } catch (selectionError) { setImageData(null); setMessage(selectionError instanceof Error ? selectionError.message : "آماده‌سازی عکس انجام نشد."); } }

  if (!isSupabaseConfigured) return <BodyMessage text="برای استفاده از این قابلیت، ابتدا مقادیر Supabase را در فایل .env.local وارد کن." />;
  if (isLoading) return <BodySkeleton />;
  if (error || !data) return <BodyMessage text={error?.message ?? "این قابلیت در دسترس نیست."} login />;

  return <main className="min-h-screen bg-paper px-4 py-5 pb-12 sm:px-8 sm:py-8"><div className="mx-auto w-full max-w-3xl"><header className="flex items-center justify-between gap-4"><div><Link className="rounded-lg text-sm font-semibold text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest" href="/dashboard">داشبورد</Link><h1 className="mt-2 text-3xl font-extrabold tracking-tight">تحلیل بدن</h1><p className="mt-1 text-sm leading-7 text-ink/65">برای مقایسهٔ روند شخصی، نه قضاوت دربارهٔ بدن.</p></div><div className="grid size-12 place-items-center rounded-2xl bg-forest text-surface"><HeartPulse className="size-5" aria-hidden /></div></header>
    <Card className="mt-6 border-barberry/30 bg-barberry/5 p-4"><div className="flex gap-3"><AlertTriangle className="mt-0.5 size-5 shrink-0 text-barberry" aria-hidden /><div className="text-sm leading-7 text-barberry"><p className="font-bold">این یک برآورد تصویری است، نه اندازه‌گیری پزشکی دقیق.</p><p className="mt-1">درصد چربی بدن یا تشخیص پزشکی ارائه نمی‌شود. برای هر نگرانی جسمی با پزشک یا متخصص مشورت کن.</p></div></div></Card>
    {!data.isAdult ? <Card className="mt-5 p-6 text-center"><ShieldCheck className="mx-auto size-7 text-forest" aria-hidden /><h2 className="mt-4 text-lg font-extrabold">اول پروفایل را کامل کن</h2><p className="mt-2 text-sm leading-7 text-ink/65">برای محافظت از حریم خصوصی، این قابلیت فقط برای کاربران بزرگسال با تاریخ تولد ثبت‌شده فعال می‌شود.</p><Link className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-forest px-4 text-sm font-semibold text-surface" href="/profile">تکمیل پروفایل</Link></Card> : <><Card className="mt-5 p-4 sm:p-6"><div className="flex items-baseline justify-between gap-3"><div><h2 className="text-lg font-extrabold">عکس پیشرفت جدید</h2><p className="mt-1 text-sm leading-7 text-ink/65">عکس پیش از ارسال تا ۱۰۲۴ پیکسل فشرده می‌شود و در bucket خصوصی جداگانه نگه‌داری خواهد شد.</p></div><Camera className="size-5 shrink-0 text-forest" aria-hidden /></div><label className="mt-5 flex min-h-36 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-mist bg-paper p-3 focus-within:ring-2 focus-within:ring-forest">{imageData ? <div className="relative w-full"><Image className="h-48 w-full rounded-xl object-cover" src={imageData} alt="پیش‌نمایش عکس انتخاب‌شده" width={1024} height={768} unoptimized /><button className="absolute left-2 top-2 grid size-8 place-items-center rounded-lg bg-surface text-ink shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest" type="button" onClick={(event) => { event.preventDefault(); setImageData(null); }} aria-label="حذف عکس"><X className="size-4" aria-hidden /></button></div> : <span className="flex flex-col items-center gap-2 text-sm font-medium text-ink/65"><ImagePlus className="size-7 text-forest" aria-hidden />عکس را آگاهانه انتخاب کن</span>}<input className="sr-only" accept="image/jpeg,image/png,image/webp" type="file" onChange={(event) => void chooseImage(event.target.files?.[0])} /></label><label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-mist bg-surface p-4 text-sm leading-7 text-ink/75 focus-within:ring-2 focus-within:ring-forest"><input className="mt-1 size-4 shrink-0 accent-forest" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>تأیید می‌کنم این عکس متعلق به من است و با ذخیرهٔ خصوصی آن و ارسال آن برای تحلیل خودکارِ غیرپزشکی موافقم. می‌دانم که هر زمان می‌توانم عکس را حذف کنم.</span></label><Button className="mt-5 w-full" disabled={!imageData || !consent || analyze.isPending} onClick={() => analyze.mutate()}>{analyze.isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <CheckCircle2 className="size-4" aria-hidden />}{analyze.isPending ? "در حال تحلیل و ذخیرهٔ امن" : "تحلیل و ذخیرهٔ امن عکس"}</Button>{message && <p className="mt-4 rounded-xl bg-barberry/10 px-3 py-2 text-sm text-barberry" role="alert">{message}</p>}</Card>
      <section className="mt-8"><div className="flex items-baseline justify-between"><h2 className="text-xl font-extrabold">روند عکس‌ها</h2><span className="text-xs font-light text-ink/55">{new Intl.NumberFormat("fa-IR").format(data.photos.length)} عکس خصوصی</span></div>{data.photos.length === 0 ? <Card className="mt-4 p-6 text-center"><p className="font-bold">هنوز عکسی ثبت نکردی</p><p className="mt-2 text-sm text-ink/65">اگر خودت راحتی، یک عکس می‌تواند نقطهٔ شروع مقایسهٔ روند شخصی باشد.</p></Card> : <div className="mt-4 grid gap-4 sm:grid-cols-2">{data.photos.map((photo) => <BodyPhotoCard key={photo.id} photo={photo} deleting={deletePhoto.isPending} onDelete={() => deletePhoto.mutate(photo.id)} />)}</div>}{deletePhoto.error && <p className="mt-4 text-sm text-barberry">{deletePhoto.error instanceof Error ? deletePhoto.error.message : "حذف عکس انجام نشد."}</p>}</section></>}</div></main>;
}

function BodyPhotoCard({ photo, deleting, onDelete }: { photo: BodyPhoto; deleting: boolean; onDelete: () => void }) { return <Card className="overflow-hidden"><Image className="h-56 w-full object-cover" src={photo.signedUrl} alt="عکس پیشرفت خصوصی" width={800} height={600} unoptimized /><div className="p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold">{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(photo.takenAt))}</p><button className="grid size-10 place-items-center rounded-xl text-barberry hover:bg-barberry/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-barberry" type="button" disabled={deleting} onClick={onDelete} aria-label="حذف کامل عکس"><Trash2 className="size-4" aria-hidden /></button></div>{photo.analysis && <div className="mt-4 space-y-4 text-sm leading-7 text-ink/70"><AnalysisList title="مشاهدات کلی" items={photo.analysis.observations} /><AnalysisList title="پیشنهاد تمرینی عمومی" items={photo.analysis.trainingSuggestions} /><AnalysisList title="نکتهٔ تغذیه‌ای عمومی" items={photo.analysis.nutritionSuggestions} /><p className="rounded-xl bg-paper p-3 text-xs text-ink/60">{photo.analysis.disclaimer}</p></div>}</div></Card>; }
function AnalysisList({ title, items }: { title: string; items: string[] }) { if (!items.length) return null; return <div><h3 className="font-bold text-ink">{title}</h3><ul className="mt-1 space-y-1">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>; }
function BodySkeleton() { return <main className="min-h-screen bg-paper px-4 py-5 sm:px-8"><div className="mx-auto max-w-3xl space-y-5"><div className="h-20 w-64 animate-pulse rounded-2xl bg-mist/65" /><div className="h-64 animate-pulse rounded-2xl bg-mist/65" /></div></main>; }
function BodyMessage({ text, login = false }: { text: string; login?: boolean }) { return <main className="grid min-h-screen place-items-center bg-paper px-4"><Card className="max-w-md p-6 text-center"><HeartPulse className="mx-auto size-6 text-forest" aria-hidden /><p className="mt-4 text-base font-extrabold">تحلیل بدن آماده نیست</p><p className="mt-2 text-sm leading-7 text-ink/65">{text}</p>{login && <Link className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-forest px-4 text-sm font-semibold text-surface" href="/login">ورود به حساب</Link>}</Card></main>; }
