import { NextResponse } from "next/server";
import { analyzeBodyImage, type BodyAnalysis } from "@/lib/ai/body-vision";
import { parseImageDataUrl } from "@/lib/ai/image-data";
import { logAiUsage } from "@/lib/admin/ai-usage";
import { isFeatureEnabled } from "@/lib/admin/flags";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 300;

function isAdult(birthDate: string) {
  const birth = new Date(`${birthDate}T12:00:00Z`);
  if (Number.isNaN(birth.getTime())) return false;
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDifference = today.getUTCMonth() - birth.getUTCMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getUTCDate() < birth.getUTCDate())
  )
    age -= 1;
  return age >= 18;
}

function asAnalysis(value: unknown): BodyAnalysis | null {
  if (!value || typeof value !== "object") return null;
  const analysis = value as Partial<BodyAnalysis>;
  return Array.isArray(analysis.observations) &&
    Array.isArray(analysis.trainingSuggestions) &&
    Array.isArray(analysis.nutritionSuggestions)
    ? (analysis as BodyAnalysis)
    : null;
}

async function getAuthenticatedClient() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { supabase, user, error };
}

export async function GET() {
  try {
    const { supabase, user, error } = await getAuthenticatedClient();
    if (error || !user)
      return NextResponse.json(
        { error: "برای دیدن عکس‌های پیشرفت وارد حسابت شو." },
        { status: 401 },
      );

    const [
      { data: profile, error: profileError },
      { data: photos, error: photosError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("body_analysis_consent_at, birth_date")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("body_photos")
        .select("id, photo_url, ai_observations, taken_at")
        .order("taken_at", { ascending: false }),
    ]);
    if (profileError || photosError)
      return NextResponse.json(
        { error: "بارگذاری عکس‌های پیشرفت انجام نشد." },
        { status: 500 },
      );

    const results = await Promise.all(
      (photos ?? []).map(async (photo) => {
        const { data, error: signedUrlError } = await supabase.storage
          .from("body-photos")
          .createSignedUrl(photo.photo_url, SIGNED_URL_TTL_SECONDS);
        if (signedUrlError || !data?.signedUrl) return null;
        return {
          id: photo.id,
          signedUrl: data.signedUrl,
          analysis: asAnalysis(photo.ai_observations),
          takenAt: photo.taken_at,
        };
      }),
    );

    return NextResponse.json({
      consentedAt: profile?.body_analysis_consent_at ?? null,
      isAdult: Boolean(profile?.birth_date && isAdult(profile.birth_date)),
      photos: results.filter((photo): photo is NonNullable<typeof photo> =>
        Boolean(photo),
      ),
    });
  } catch {
    return NextResponse.json(
      { error: "تنظیمات اتصال به سرویس کامل نیست." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, error } = await getAuthenticatedClient();
    if (error || !user)
      return NextResponse.json(
        { error: "برای تحلیل عکس وارد حسابت شو." },
        { status: 401 },
      );

    const body = (await request.json()) as Record<string, unknown>;
    if (!(await isFeatureEnabled("body_analysis", true)))
      return NextResponse.json(
        { error: "تحلیل عکس بدن موقتاً در دسترس نیست." },
        { status: 503 },
      );
    if (body.consent !== true)
      return NextResponse.json(
        { error: "برای ادامه باید رضایت آگاهانه را تأیید کنی." },
        { status: 400 },
      );

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("birth_date")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError)
      return NextResponse.json(
        { error: "اطلاعات پروفایل در دسترس نیست." },
        { status: 500 },
      );
    if (!profile?.birth_date || !isAdult(profile.birth_date))
      return NextResponse.json(
        {
          error:
            "این قابلیت فقط برای کاربران بزرگسال با تاریخ تولد تأییدشده در پروفایل در دسترس است.",
        },
        { status: 422 },
      );

    let image;
    try {
      image = parseImageDataUrl(body.imageData);
    } catch {
      return NextResponse.json(
        {
          error:
            "فایل عکس معتبر نیست یا پس از فشرده‌سازی بزرگ‌تر از ۲ مگابایت است.",
        },
        { status: 400 },
      );
    }

    const analysis = await analyzeBodyImage({
      imageBase64: image.base64,
      mimeType: image.mimeType,
    });
    void logAiUsage({ userId: user.id, feature: "body_photo" });
    const extension =
      image.mimeType === "image/jpeg" ? "jpg" : image.mimeType.split("/")[1];
    const photoPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("body-photos")
      .upload(photoPath, image.bytes, {
        contentType: image.mimeType,
        upsert: false,
      });
    if (uploadError)
      return NextResponse.json(
        { error: "ذخیرهٔ امن عکس انجام نشد. از تنظیم bucket مطمئن شو." },
        { status: 500 },
      );

    const [{ data: photo, error: photoError }, { error: consentError }] =
      await Promise.all([
        supabase
          .from("body_photos")
          .insert({
            user_id: user.id,
            photo_url: photoPath,
            ai_observations: analysis,
          })
          .select("id, taken_at")
          .single(),
        supabase
          .from("profiles")
          .update({ body_analysis_consent_at: new Date().toISOString() })
          .eq("id", user.id),
      ]);
    if (photoError || consentError || !photo) {
      await supabase.storage.from("body-photos").remove([photoPath]);
      return NextResponse.json(
        { error: "ذخیرهٔ تحلیل انجام نشد." },
        { status: 500 },
      );
    }

    const { data: signed } = await supabase.storage
      .from("body-photos")
      .createSignedUrl(photoPath, SIGNED_URL_TTL_SECONDS);
    return NextResponse.json(
      {
        photo: {
          id: photo.id,
          signedUrl: signed?.signedUrl ?? null,
          analysis,
          takenAt: photo.taken_at,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Body analysis failed", error);
    return NextResponse.json(
      {
        error:
          "تحلیل عکس این بار انجام نشد. عکس را بررسی کن یا بعداً دوباره تلاش کن.",
      },
      { status: 422 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { error: "شناسهٔ عکس لازم است." },
        { status: 400 },
      );
    const { supabase, user, error } = await getAuthenticatedClient();
    if (error || !user)
      return NextResponse.json(
        { error: "برای حذف عکس وارد حسابت شو." },
        { status: 401 },
      );

    const { data: photo, error: photoError } = await supabase
      .from("body_photos")
      .select("id, photo_url")
      .eq("id", id)
      .maybeSingle();
    if (photoError || !photo)
      return NextResponse.json({ error: "عکس پیدا نشد." }, { status: 404 });

    const { error: storageError } = await supabase.storage
      .from("body-photos")
      .remove([photo.photo_url]);
    if (storageError)
      return NextResponse.json(
        { error: "حذف فایل عکس انجام نشد." },
        { status: 500 },
      );
    const { error: deleteError } = await supabase
      .from("body_photos")
      .delete()
      .eq("id", id);
    if (deleteError)
      return NextResponse.json(
        { error: "حذف رکورد عکس انجام نشد." },
        { status: 500 },
      );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "حذف عکس انجام نشد." }, { status: 500 });
  }
}
