"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
type Flag = {
  key: string;
  enabled: boolean;
  value: { monthlyUsd?: number };
  description: string | null;
  is_public: boolean;
  updated_at: string;
};
type Settings = {
  flags: Flag[];
  ai: { provider: string; model: string; key: string; configured: boolean };
};
async function getSettings(): Promise<Settings> {
  const r = await fetch("/api/admin/settings");
  const p = (await r.json()) as Settings & { error?: string };
  if (!r.ok) throw new Error(p.error ?? "بارگذاری تنظیمات انجام نشد.");
  return p;
}
export function AdminSettings() {
  const qc = useQueryClient();
  const [newKey, setNewKey] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const { data, error } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: getSettings,
  });
  const update = useMutation({
    mutationFn: async ({
      key,
      enabled,
      value,
    }: {
      key: string;
      enabled: boolean;
      value?: Record<string, unknown>;
    }) => {
      const r = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          enabled,
          value,
          description: key === newKey ? "" : undefined,
        }),
      });
      const p = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(p.error ?? "ذخیرهٔ تنظیمات انجام نشد.");
    },
    onSuccess: () => {
      setNewKey("");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });
  const savedLimit =
    data?.flags.find((flag) => flag.key === "ai_cost_alert")?.value
      ?.monthlyUsd ?? 0;
  return (
    <section className="max-w-2xl">
      <h1 className="text-2xl font-bold">تنظیمات سیستم</h1>
      {data && (
        <div className="mt-5 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
          <h2 className="font-semibold">وضعیت AI</h2>
          <p className="mt-2">Provider: {data.ai.provider}</p>
          <p>Model: {data.ai.model}</p>
          <p>API key: {data.ai.key}</p>
          <p
            className={data.ai.configured ? "text-emerald-700" : "text-red-700"}
          >
            {data.ai.configured ? "متصل" : "تنظیم نشده"}
          </p>
        </div>
      )}
      <div className="mt-5 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="font-semibold">سقف هشدار AI</h2>
        <p className="mt-1 text-sm text-zinc-600">
          هزینهٔ ماهانهٔ تخمینی بر حسب دلار؛ صفر یعنی هشدار غیرفعال.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            className="h-9 w-36 rounded border border-zinc-300 px-2 text-sm"
            type="number"
            min="0"
            step="0.01"
            placeholder={String(savedLimit)}
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(e.target.value)}
          />
          <button
            className="rounded border border-zinc-300 px-3 text-sm"
            onClick={() =>
              update.mutate({
                key: "ai_cost_alert",
                enabled: true,
                value: { monthlyUsd: Number(monthlyLimit || savedLimit || 0) },
              })
            }
          >
            ذخیره سقف
          </button>
        </div>
      </div>
      <div className="mt-5 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="font-semibold">Feature flagها</h2>
        <div className="mt-3 space-y-2">
          {data?.flags
            .filter((flag) => flag.key !== "ai_cost_alert")
            .map((flag) => (
              <label
                className="flex items-center justify-between rounded border border-zinc-200 p-3 text-sm"
                key={flag.key}
              >
                <span>
                  <b>{flag.key}</b>
                  <span className="mr-2 text-xs text-zinc-500">
                    {flag.description}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={flag.enabled}
                  onChange={(e) =>
                    update.mutate({
                      key: flag.key,
                      enabled: e.target.checked,
                      value: flag.value,
                    })
                  }
                />
              </label>
            ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            className="h-9 flex-1 rounded border border-zinc-300 px-2 text-sm"
            placeholder="feature flag جدید، مثل body_analysis"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <button
            className="rounded border border-zinc-300 px-3 text-sm"
            onClick={() =>
              newKey && update.mutate({ key: newKey, enabled: true })
            }
          >
            افزودن
          </button>
        </div>
        {update.error && (
          <p className="mt-3 text-sm text-red-700">{update.error.message}</p>
        )}
      </div>
      {error && <p className="mt-4 text-sm text-red-700">{error.message}</p>}
    </section>
  );
}
