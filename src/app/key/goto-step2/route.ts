import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";
import { getClientIp, sha256Hex } from "@/libs/ip";
import { rateLimit } from "@/libs/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKINK_STEP2 = process.env.WORKINK_STEP2_URL;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);

  const limit = await rateLimit({
    bucket: "goto2",
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

  if (!WORKINK_STEP2) {
    return NextResponse.json(
      { ok: false, message: "Step 2 not configured" },
      { status: 500 },
    );
  }

  // Make sure the visitor actually completed step 1 before sending them off.
  const sb = supabaseAdmin();
  const ipHash = sha256Hex(ip);
  const { data } = await sb
    .from("key_flows")
    .select("stage, expires_at")
    .eq("ip_hash", ipHash)
    .limit(1);

  const flow = data && data[0];
  if (!flow || flow.stage !== 1 || new Date(flow.expires_at) < new Date()) {
    return NextResponse.redirect(new URL("/key?step=0", req.url).toString(), 302);
  }

  return NextResponse.redirect(WORKINK_STEP2, 302);
}
