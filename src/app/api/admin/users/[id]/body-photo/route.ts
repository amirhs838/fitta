import { NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { adminRouteError, requireAdminPermission } from "@/lib/admin/route";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await context.params;
    const body = await request.json() as { photoId?: string };
    if (!body.photoId) return NextResponse.json({ error: "شناسهٔ عکس لازم است." }, { status: 400 });
    const { admin, client } = await requireAdminPermission("view_body_photos");
    const { data: photo, error } = await client.from("body_photos").select("id, photo_url, taken_at").eq("id", body.photoId).eq("user_id", userId).maybeSingle();
    if (error || !photo) return NextResponse.json({ error: "عکس پیدا نشد." }, { status: 404 });
    const { data: signed, error: signedError } = await client.storage.from("body-photos").createSignedUrl(photo.photo_url, 120);
    if (signedError || !signed?.signedUrl) throw signedError ?? new Error("Unable to create signed URL");
    await writeAdminAuditLog(admin, { action: "view_body_photo", targetType: "body_photo", targetId: photo.id, metadata: { userId } });
    return NextResponse.json({ signedUrl: signed.signedUrl, expiresIn: 120 });
  } catch (error) { return adminRouteError(error); }
}
