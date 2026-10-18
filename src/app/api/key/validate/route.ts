import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";
import { durationToSeconds } from "@/libs/keys";
import { getClientIp } from "@/libs/ip";
import { rateLimit } from "@/libs/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ValidatePayload {
  key?: string;
  hwid?: string;
  username?: string;
  userId?: string | number;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Hard limit abusive callers (brute-force / spraying) — generous for real
  // Roblox clients which validate once per launch.
  const ip = getClientIp(req);
  const limit = await rateLimit({
    bucket: "validate",
    ip,
    limit: 30,
    windowSec: 60,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: ValidatePayload;
  try {
    body = (await req.json()) as ValidatePayload;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const key = String(body.key || "").trim();
  const hwid = String(body.hwid || "").trim();
  const username = String(body.username || "").trim();
  const userId = String(body.userId || "").trim();

  if (!key || !hwid || !username || !userId) {
    return NextResponse.json({ ok: false, message: "Missing fields" }, { status: 400 });
  }
  if (key.length > 128 || hwid.length > 256 || username.length > 64 || userId.length > 32) {
    return NextResponse.json({ ok: false, message: "Field too long" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const now = new Date();

  const { data: rows, error } = await sb
    .from("keys")
    .select("*")
    .eq("key_value", key)
    .limit(1);

  if (error) {
    return NextResponse.json({ ok: false, message: "DB error" }, { status: 500 });
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: false, message: "Key invalid" });
  }

  const k = rows[0];

  if (k.disabled_at) {
    return NextResponse.json({ ok: false, message: "Key disabled" });
  }

  if (k.expires_at && new Date(k.expires_at) < now) {
    if (k.status !== "expired") {
      await sb.from("keys").update({ status: "expired" }).eq("id", k.id);
    }
    return NextResponse.json({ ok: false, message: "Key expired" });
  }

  // first bind
  if (!k.first_used_at) {
    const durSec = durationToSeconds(k.duration_type);
    const expiresAt = durSec ? new Date(now.getTime() + durSec * 1000).toISOString() : null;

    const { error: uerr } = await sb
      .from("keys")
      .update({
        first_used_at: now.toISOString(),
        expires_at: expiresAt,
        hwid,
        roblox_username: username,
        roblox_user_id: userId,
        status: "active",
      })
      .eq("id", k.id);

    if (uerr) {
      return NextResponse.json({ ok: false, message: "DB error" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Key bound and valid",
      lifetime: k.duration_type === "lifetime",
      expires_at: expiresAt,
    });
  }

  if (k.hwid && k.hwid !== hwid) {
    return NextResponse.json({ ok: false, message: "Key is HWID locked" });
  }

  return NextResponse.json({
    ok: true,
    message: "Key valid",
    lifetime: k.duration_type === "lifetime",
    expires_at: k.expires_at,
  });
}
