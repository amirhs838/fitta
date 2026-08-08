"use client";

import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type Detail = {
  profile: {
    full_name: string | null;
    email: string;
    goal: string | null;
    daily_calorie_target: number | null;
    medical_conditions: string[];
    suspended: boolean;
    created_at: string;
  };
  weights: Array<{ weight_kg: number; logged_at: string }>;
  meals: Array<{
    id: string;
    meal_type: string;
    total_calories: number;
    logged_at: string;
  }>;
  plans: Array<{ id: string; is_active: boolean; generated_at: string }>;
  bodyPhotos: Array<{ id: string; taken_at: string }>;
};
async function getDetail(id: string): Promise<Detail> {
  const response = await fetch(`/api/admin/users/${id}`);
  const payload = (await response.json()) as Detail & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "کاربر پیدا نشد.");
  return payload;
}
export function AdminUserDetail({ userId }: { userId: string }) {
  const client = useQueryClient();
  const [shownPhoto, setShownPhoto] = useState<{
    id: string;
    url: string;
  } | null>(null);
  const { data, error } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => getDetail(userId),
  });
  const change = useMutation({
    mutationFn: async (action: "suspend" | "activate" | "delete") => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers:
          action === "delete"
            ? undefined
            : { "Content-Type": "application/json" },
        body: action === "delete" ? undefined : JSON.stringify({ action }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "عملیات انجام نشد.");
    },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["admin-user", userId] }),
  });
  const viewPhoto = useMutation({
    mutationFn: async (photoId: string) => {
      const response = await fetch(`/api/admin/users/${userId}/body-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });
      const payload = (await response.json()) as {
        signedUrl?: string;
        error?: string;
      };
      if (!response.ok || !payload.signedUrl)
        throw new Error(payload.error ?? "نمایش عکس انجام نشد.");
      return { id: photoId, url: payload.signedUrl };
    },
    onSuccess: setShownPhoto,
  });
  if (error || !data)
    return (
      <p className="text-sm text-red-700">
        {error?.message ?? "در حال بارگذاری…"}
      </p>
    );
  const { profile } = data;
  return (
    <section>
      <Link
        className="text-sm text-zinc-600 hover:underline"
        href="/admin/users"
      >
        بازگشت به کاربران
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {profile.full_name || "بدون نام"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">{profile.email}</p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            onClick={() =>
              change.mutate(profile.suspended ? "activate" : "suspend")
            }
          >
            {profile.suspended ? "فعال‌سازی" : "تعلیق"}
          </button>
          <button
            className="rounded-md bg-red-700 px-3 py-2 text-sm text-white"
            onClick={() => {
              if (window.confirm("حساب و داده‌های مرتبط حذف شود؟"))
                change.mutate("delete");
            }}
          >
            حذف کامل
          </button>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Panel title="پروفایل">
          <p>هدف: {profile.goal ?? "—"}</p>
          <p>کالری: {profile.daily_calorie_target ?? "—"}</p>
          <p>شرایط: {profile.medical_conditions?.join("، ") || "—"}</p>
        </Panel>
        <Panel title="وزن">
          {data.weights
            .slice(0, 6)
            .map((item) => (
              <p key={item.logged_at}>{item.weight_kg} کیلوگرم</p>
            )) || "—"}
        </Panel>
        <Panel title="وعده‌های اخیر">
          {data.meals.slice(0, 6).map((item) => (
            <p key={item.id}>
              {item.meal_type}: {item.total_calories} کالری
            </p>
          )) || "—"}
        </Panel>
      </div>
      <Panel className="mt-4" title="عکس‌های بدن (پنهان پیش‌فرض)">
        {data.bodyPhotos.length === 0 ? (
          <p>عکسی ثبت نشده است.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {data.bodyPhotos.map((photo) => (
              <div
                className="relative h-28 overflow-hidden rounded bg-zinc-200"
                key={photo.id}
              >
                {shownPhoto?.id === photo.id ? (
                  <Image
                    src={shownPhoto.url}
                    alt="عکس بدن کاربر"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="h-full blur-xl" />
                )}
                <button
                  className="absolute inset-x-2 bottom-2 rounded bg-white px-2 py-1 text-xs shadow"
                  onClick={() => viewPhoto.mutate(photo.id)}
                >
                  نمایش عکس
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          هر نمایش عکس با نام ادمین و زمان در audit log ثبت می‌شود.
        </p>
      </Panel>
      {change.error && (
        <p className="mt-4 text-sm text-red-700">{change.error.message}</p>
      )}
      {viewPhoto.error && (
        <p className="mt-4 text-sm text-red-700">{viewPhoto.error.message}</p>
      )}
    </section>
  );
}
function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-7 text-zinc-700 ${className}`}
    >
      <h2 className="mb-2 font-semibold text-zinc-950">{title}</h2>
      {children}
    </div>
  );
}
