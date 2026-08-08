import { NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { adminRouteError, requireAdminPermission } from "@/lib/admin/route";

function maskedKey(value: string | undefined) {
  if (!value) return "تنظیم نشده";
  return `••••••${value.slice(-4)}`;
}

export async function GET() {
  try {
    const { client } = await requireAdminPermission("manage_system_flags");
    const { data, error } = await client
      .from("system_flags")
      .select("key, enabled, value, description, is_public, updated_at")
      .order("key");
    if (error) throw error;
    return NextResponse.json({
      flags: data ?? [],
      ai: {
        provider: process.env.AI_PROVIDER ?? "تنظیم نشده",
        model: process.env.AI_MODEL ?? "پیش‌فرض",
        key: maskedKey(process.env.AI_PROVIDER_API_KEY),
        configured: Boolean(
          process.env.AI_PROVIDER && process.env.AI_PROVIDER_API_KEY,
        ),
      },
    });
  } catch (error) {
    return adminRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { admin, client } = await requireAdminPermission(
      "manage_system_flags",
    );
    if (admin.role !== "super_admin")
      return NextResponse.json(
        { error: "تنها super_admin می‌تواند تنظیمات سیستم را تغییر دهد." },
        { status: 403 },
      );
    const body = (await request.json()) as {
      key?: string;
      enabled?: boolean;
      description?: string;
      isPublic?: boolean;
      value?: Record<string, unknown>;
    };
    const key = body.key?.trim();
    if (
      !key ||
      !/^[a-z][a-z0-9_]{0,79}$/.test(key) ||
      typeof body.enabled !== "boolean"
    )
      return NextResponse.json(
        { error: "تنظیم flag معتبر نیست." },
        { status: 400 },
      );
    const { error } = await client.from("system_flags").upsert(
      {
        key,
        enabled: body.enabled,
        value: body.value ?? {},
        description: body.description?.trim().slice(0, 300) || null,
        is_public: body.isPublic === true,
      },
      { onConflict: "key" },
    );
    if (error) throw error;
    await writeAdminAuditLog(admin, {
      action: "update_system_flag",
      targetType: "system_flag",
      targetId: key,
      metadata: { enabled: body.enabled },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return adminRouteError(error);
  }
}
