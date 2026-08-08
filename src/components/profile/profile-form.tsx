"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Activity,
  HeartPulse,
  LoaderCircle,
  Save,
  UserRound,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type ProfileState = {
  fullName: string;
  gender: string;
  birthDate: string;
  heightCm: string;
  weightKg: string;
  activityLevel: string;
  goal: string;
  medicalConditions: string[];
};

type ProfileResponse = {
  profile:
    | (Omit<ProfileState, "weightKg" | "heightCm"> & {
        heightCm: number | "";
        dailyCalorieTarget: number | null;
      })
    | null;
  latestWeight: { weightKg: number; loggedAt: string } | null;
};

const genderOptions = [
  { value: "female", label: "زن" },
  { value: "male", label: "مرد" },
  { value: "other", label: "دیگر / ترجیح می‌دهم نگویم" },
];
const activityOptions = [
  { value: "sedentary", label: "کم‌تحرک — بیشترِ روز نشسته" },
  { value: "light", label: "فعالیت سبک — ۱ تا ۳ روز در هفته" },
  { value: "moderate", label: "متوسط — ۳ تا ۵ روز در هفته" },
  { value: "active", label: "فعال — ۶ تا ۷ روز در هفته" },
  { value: "very_active", label: "خیلی فعال — تمرین سنگین یا کار بدنی" },
];
const goalOptions = [
  { value: "lose_weight", label: "کاهش وزن" },
  { value: "fat_loss", label: "چربی‌سوزی" },
  { value: "maintain", label: "حفظ وزن" },
  { value: "gain_weight", label: "افزایش وزن" },
  { value: "build_muscle", label: "عضله‌سازی" },
];
const medicalOptions = [
  { value: "diabetes_type1", label: "دیابت نوع ۱" },
  { value: "diabetes_type2", label: "دیابت نوع ۲" },
  { value: "hypertension", label: "فشار خون" },
  { value: "pregnancy", label: "بارداری" },
  { value: "other", label: "شرایط دیگر" },
];

async function fetchProfile(): Promise<ProfileResponse> {
  const response = await fetch("/api/profile");
  const payload = (await response.json()) as ProfileResponse & {
    error?: string;
  };
  if (!response.ok)
    throw new Error(payload.error ?? "بارگذاری پروفایل انجام نشد.");
  return payload;
}

export function ProfileForm() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
    enabled: isSupabaseConfigured,
  });

  if (!isSupabaseConfigured)
    return (
      <ProfileMessage text="برای ساخت هدف شخصی، ابتدا مقادیر Supabase را در فایل .env.local وارد کن." />
    );
  if (isLoading) return <ProfileSkeleton />;
  if (error) return <ProfileMessage text={error.message} login />;

  const initialForm: ProfileState = {
    fullName: data?.profile?.fullName ?? "",
    gender: data?.profile?.gender ?? "",
    birthDate: data?.profile?.birthDate ?? "",
    heightCm:
      data?.profile?.heightCm === "" || data?.profile?.heightCm === undefined
        ? ""
        : String(data.profile.heightCm),
    weightKg: data?.latestWeight ? String(data.latestWeight.weightKg) : "",
    activityLevel: data?.profile?.activityLevel ?? "",
    goal: data?.profile?.goal ?? "",
    medicalConditions: data?.profile?.medicalConditions ?? [],
  };
  return (
    <ProfileEditor
      key={JSON.stringify(initialForm)}
      initialForm={initialForm}
    />
  );
}

function ProfileEditor({ initialForm }: { initialForm: ProfileState }) {
  const [form, setForm] = useState<ProfileState>(initialForm);
  const [result, setResult] = useState<{
    calorieTarget: number;
    bmr: number;
    tdee: number;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const saveProfile = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          heightCm: Number(form.heightCm),
          weightKg: Number(form.weightKg),
        }),
      });
      const payload = (await response.json()) as {
        calorieTarget?: number;
        bmr?: number;
        tdee?: number;
        error?: string;
      };
      if (
        !response.ok ||
        payload.calorieTarget === undefined ||
        payload.bmr === undefined ||
        payload.tdee === undefined
      )
        throw new Error(payload.error ?? "ذخیرهٔ پروفایل انجام نشد.");
      return {
        calorieTarget: payload.calorieTarget,
        bmr: payload.bmr,
        tdee: payload.tdee,
      };
    },
    onSuccess: (value) => {
      setResult(value);
      setMessage(null);
    },
    onError: (mutationError) =>
      setMessage(
        mutationError instanceof Error
          ? mutationError.message
          : "ذخیرهٔ پروفایل انجام نشد.",
      ),
  });

  function setField(field: keyof ProfileState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  function toggleCondition(condition: string) {
    setForm((current) => ({
      ...current,
      medicalConditions: current.medicalConditions.includes(condition)
        ? current.medicalConditions.filter((item) => item !== condition)
        : [...current.medicalConditions, condition],
    }));
  }

  const hasMedicalCondition = form.medicalConditions.length > 0;
  return (
    <main className="min-h-screen bg-paper px-4 py-5 pb-12 sm:px-8 sm:py-8">
      <div className="mx-auto w-full max-w-2xl">
        <header className="flex items-center justify-between">
          <div>
            <Link
              className="rounded-lg text-sm font-semibold text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
              href="/dashboard"
            >
              داشبورد
            </Link>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              پروفایل و هدف
            </h1>
            <p className="mt-1 text-sm leading-7 text-ink/65">
              چند اطلاعات پایه برای یک هدف تقریبی و قابل‌تنظیم.
            </p>
          </div>
          <div className="grid size-12 place-items-center rounded-2xl bg-forest text-surface">
            <UserRound className="size-5" aria-hidden />
          </div>
        </header>
        {hasMedicalCondition && (
          <Card className="mt-6 border-barberry/30 bg-barberry/5 p-4">
            <div className="flex gap-3">
              <HeartPulse
                className="mt-0.5 size-5 shrink-0 text-barberry"
                aria-hidden
              />
              <p className="text-sm leading-7 text-barberry">
                این پیشنهاد جایگزین مشاوره پزشک یا متخصص تغذیه نیست؛ به‌خصوص
                برای شرایط پزشکی خاص، حتماً با پزشک خود مشورت کنید.
              </p>
            </div>
          </Card>
        )}
        <Card className="mt-6 p-4 sm:p-6">
          <section>
            <h2 className="text-lg font-extrabold">اطلاعات پایه</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="نام" optional>
                <Input
                  value={form.fullName}
                  maxLength={100}
                  placeholder="مثلاً سارا"
                  onChange={(event) => setField("fullName", event.target.value)}
                />
              </Field>
              <Field label="جنسیت">
                <Select
                  value={form.gender}
                  onChange={(value) => setField("gender", value)}
                  options={genderOptions}
                  placeholder="انتخاب کن"
                />
              </Field>
              <Field label="تاریخ تولد">
                <Input
                  type="date"
                  value={form.birthDate}
                  onChange={(event) =>
                    setField("birthDate", event.target.value)
                  }
                />
              </Field>
              <Field label="قد (سانتی‌متر)">
                <Input
                  type="number"
                  min="100"
                  max="250"
                  value={form.heightCm}
                  onChange={(event) => setField("heightCm", event.target.value)}
                />
              </Field>
              <Field label="وزن فعلی (کیلوگرم)">
                <Input
                  type="number"
                  step="0.1"
                  min="30"
                  max="350"
                  value={form.weightKg}
                  onChange={(event) => setField("weightKg", event.target.value)}
                />
              </Field>
            </div>
          </section>
          <section className="mt-8 border-t border-mist pt-6">
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <Activity className="size-5 text-forest" aria-hidden />
              سبک زندگی و هدف
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="سطح فعالیت">
                <Select
                  value={form.activityLevel}
                  onChange={(value) => setField("activityLevel", value)}
                  options={activityOptions}
                  placeholder="انتخاب کن"
                />
              </Field>
              <Field label="هدف اصلی">
                <Select
                  value={form.goal}
                  onChange={(value) => setField("goal", value)}
                  options={goalOptions}
                  placeholder="انتخاب کن"
                />
              </Field>
            </div>
          </section>
          <section className="mt-8 border-t border-mist pt-6">
            <h2 className="text-lg font-extrabold">
              شرایط پزشکی{" "}
              <span className="text-sm font-light text-ink/55">(اختیاری)</span>
            </h2>
            <p className="mt-1 text-sm leading-7 text-ink/65">
              فقط برای نمایش تذکر محتاطانه استفاده می‌شود؛ این اپ تشخیص پزشکی
              انجام نمی‌دهد.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {medicalOptions.map((option) => (
                <label
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-mist bg-paper px-3 text-sm font-medium focus-within:ring-2 focus-within:ring-forest"
                  key={option.value}
                >
                  <input
                    className="size-4 accent-forest"
                    type="checkbox"
                    checked={form.medicalConditions.includes(option.value)}
                    onChange={() => toggleCondition(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </section>
          <Button
            className="mt-8 w-full"
            disabled={saveProfile.isPending}
            onClick={() => {
              setMessage(null);
              saveProfile.mutate();
            }}
          >
            {saveProfile.isPending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            {saveProfile.isPending ? "در حال ذخیره" : "ذخیره و محاسبهٔ هدف"}
          </Button>
          {message && (
            <p
              className="mt-4 rounded-xl bg-barberry/10 px-3 py-2 text-sm text-barberry"
              role="alert"
            >
              {message}
            </p>
          )}
        </Card>
        {result && (
          <Card className="mt-5 border-forest/20 bg-forest p-5 text-surface">
            <p className="text-sm font-light text-surface/75">
              هدف روزانهٔ تقریبی تو
            </p>
            <p className="mt-2 text-4xl font-extrabold">
              {new Intl.NumberFormat("fa-IR").format(result.calorieTarget)}{" "}
              <span className="text-base font-medium">کالری</span>
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-surface/20 pt-4 text-sm">
              <p>
                <span className="block text-xs font-light text-surface/70">
                  BMR تقریبی
                </span>
                {new Intl.NumberFormat("fa-IR").format(result.bmr)} کالری
              </p>
              <p>
                <span className="block text-xs font-light text-surface/70">
                  مصرف روزانهٔ تخمینی
                </span>
                {new Intl.NumberFormat("fa-IR").format(result.tdee)} کالری
              </p>
            </div>
            <p className="mt-4 text-xs leading-6 text-surface/75">
              این عدد یک برآورد عمومی است و جایگزین نظر پزشک یا متخصص تغذیه
              نیست.
            </p>
          </Card>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  optional = false,
  children,
}: {
  label: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>
        {label}{" "}
        {optional && <span className="font-light text-ink/55">(اختیاری)</span>}
      </span>
      {children}
    </label>
  );
}
function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
  return (
    <select
      className="h-12 w-full rounded-xl border border-mist bg-surface px-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/20"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
function ProfileSkeleton() {
  return (
    <main className="min-h-screen bg-paper px-4 py-5 sm:px-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="h-20 w-64 animate-pulse rounded-2xl bg-mist/65" />
        <div className="h-96 animate-pulse rounded-2xl bg-mist/65" />
      </div>
    </main>
  );
}
function ProfileMessage({
  text,
  login = false,
}: {
  text: string;
  login?: boolean;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4">
      <Card className="max-w-md p-6 text-center">
        <UserRound className="mx-auto size-6 text-forest" aria-hidden />
        <p className="mt-4 text-base font-extrabold">پروفایل آماده نیست</p>
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
