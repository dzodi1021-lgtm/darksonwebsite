import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";
import { getClientIp, sha256Hex } from "@/libs/ip";
import { rateLimit } from "@/libs/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKINK_STEP1 =
  process.env.WORKINK_STEP1_URL || "https://work.ink/2kKN/step1";
const FLOW_TTL_MS = 30 * 60 * 1000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);

  // Soft limit — prevents someone from spamming the flow row endlessly.
  const limit = await rateLimit({
    bucket: "goto1",
    ip,
    limit: 20,
    windowSec: 60,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const sb = supabaseAdmin();
  const ipHash = sha256Hex(ip);
  const expiresAt = new Date(Date.now() + FLOW_TTL_MS).toISOString();

  await sb.from("key_flows").upsert(
    [
      {
        ip_hash: ipHash,
        stage: 0,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
    ],
    { onConflict: "ip_hash" },
  );

  return NextResponse.redirect(WORKINK_STEP1, 302);
}
