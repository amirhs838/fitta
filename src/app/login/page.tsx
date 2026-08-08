"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!isSupabaseConfigured) {
      setMessage(
        "اتصال Supabase هنوز تنظیم نشده است. مقادیر .env.local را وارد کن.",
      );
      return;
    }

    setIsSubmitting(true);
    const { error } = await createClient().auth.signInWithPassword({
      email,
      password,
    });
    setIsSubmitting(false);

    if (error) {
      setMessage("ورود انجام نشد. ایمیل و رمز عبور را دوباره بررسی کن.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5 py-8">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <Link
          className="inline-flex rounded-lg text-sm font-semibold text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          href="/"
        >
          بازگشت به فیتا
        </Link>
        <h1 className="mt-7 text-3xl font-extrabold tracking-tight">
          خوش برگشتی
        </h1>
        <p className="mt-2 text-sm leading-7 text-ink/65">
          وارد حسابت شو و از همان‌جا ادامه بده.
        </p>
        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label
            className="block space-y-2 text-sm font-medium"
            htmlFor="email"
          >
            <span>ایمیل</span>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label
            className="block space-y-2 text-sm font-medium"
            htmlFor="password"
          >
            <span>رمز عبور</span>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {message && (
            <p
              className="rounded-xl bg-barberry/10 px-3 py-2 text-sm text-barberry"
              role="alert"
            >
              {message}
            </p>
          )}
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <>
                ورود <ArrowLeft className="size-4" aria-hidden />
              </>
            )}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-ink/65">
          حساب نداری؟{" "}
          <Link
            className="font-semibold text-forest hover:underline"
            href="/register"
          >
            ثبت‌نام کن
          </Link>
        </p>
      </Card>
    </main>
  );
}
