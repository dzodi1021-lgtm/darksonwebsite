import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/libs/admin";
import { effectiveStatus } from "@/libs/keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const sb = await requireAdmin();
  if (!sb) return unauthorized();

  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) {
    return NextResponse.json({ ok: false, message: "Bad id" }, { status: 400 });
  }

  const { error } = await sb.from("keys").delete().eq("id", n);
  if (error) {
    return NextResponse.json({ ok: false, message: "DB error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

interface PatchBody {
  disabled?: boolean;
  reset_hwid?: boolean;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const sb = await requireAdmin();
  if (!sb) return unauthorized();

  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) {
    return NextResponse.json({ ok: false, message: "Bad id" }, { status: 400 });
  }

  let body: PatchBody = {};
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    /* allow empty */
  }

  const patch: Record<string, string | null> = {};
  if (typeof body.disabled === "boolean") {
    patch.disabled_at = body.disabled ? new Date().toISOString() : null;
    patch.status = body.disabled ? "disabled" : "active";
  }
  if (body.reset_hwid === true) {
    patch.hwid = null;
    patch.roblox_username = null;
    patch.roblox_user_id = null;
    patch.first_used_at = null;
    patch.expires_at = null;
    patch.status = "unused";
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, message: "No change" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("keys")
    .update(patch)
    .eq("id", n)
    .select("*")
    .limit(1);

  if (error || !data || !data[0]) {
    return NextResponse.json({ ok: false, message: "DB error" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    key: { ...data[0], effective_status: effectiveStatus(data[0]) },
  });
}
