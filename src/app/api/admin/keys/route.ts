import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/libs/admin";
import {
  DURATIONS,
  effectiveStatus,
  generateKey,
  type DurationType,
} from "@/libs/keys";
import { sweepExpiredKeys } from "@/libs/sweep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const sb = await requireAdmin();
  if (!sb) return unauthorized();

  // Make sure anything that rotted since the last visit is marked expired.
  await sweepExpiredKeys();

  const { data, error } = await sb
    .from("keys")
    .select(
      "id, key_value, status, duration_type, first_used_at, expires_at, hwid, roblox_username, roblox_user_id, disabled_at, created_at",
    )
    .order("id", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, message: "DB error" }, { status: 500 });
  }

  // Add a computed status so the UI never shows a rotten key as "active".
  const enriched = (data || []).map((k) => ({
    ...k,
    effective_status: effectiveStatus(k),
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const sb = await requireAdmin();
  if (!sb) return unauthorized();

  let body: { duration_type?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty */
  }

  const duration_type: DurationType = (DURATIONS as string[]).includes(
    String(body.duration_type || ""),
  )
    ? (body.duration_type as DurationType)
    : "1d";

  let key_value = "";
  for (let i = 0; i < 10; i++) {
    const candidate = generateKey();
    const { data: exists, error: e2 } = await sb
      .from("keys")
      .select("id")
      .eq("key_value", candidate)
      .limit(1);
    if (e2) return NextResponse.json({ ok: false, message: "DB error" }, { status: 500 });
    if (!exists || exists.length === 0) {
      key_value = candidate;
      break;
    }
  }
  if (!key_value) {
    return NextResponse.json(
      { ok: false, message: "Failed to generate unique key" },
      { status: 500 },
    );
  }

  const { data, error } = await sb
    .from("keys")
    .insert([{ key_value, duration_type }])
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
