import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/libs/supabase";
import { constantTimeEquals, credentialsSignature } from "@/libs/workink";
import { randomToken } from "@/libs/keys";
import { getClientIp } from "@/libs/ip";
import { rateLimit } from "@/libs/rate-limit";
import { setSessionCookie } from "@/libs/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_DAYS = Number(process.env.ADMIN_SESSION_TTL_DAYS || "30");
const SESSION_TTL_MS = Math.max(1, TTL_DAYS) * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);

  // 5 attempts / 5 minutes per IP — enough for a typo, nowhere near a bruteforce.
  const limit = await rateLimit({ bucket: "admin_login", ip, limit: 5, windowSec: 300 });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");
  if (!username || !password) {
    return NextResponse.json({ ok: false, message: "Missing fields" }, { status: 400 });
  }

  const adminUser = process.env.ADMIN_USERNAME || "";
  const adminPass = process.env.ADMIN_PASSWORD || "";
  if (!adminUser || !adminPass) {
    return NextResponse.json(
      { ok: false, message: "Admin not configured" },
      { status: 500 },
    );
  }

  const userOk = constantTimeEquals(username, adminUser);
  const passOk = constantTimeEquals(password, adminPass);
  if (!(userOk && passOk)) {
    return NextResponse.json(
      { ok: false, message: "Invalid credentials" },
      { status: 401 },
    );
  }

  const sb = supabaseAdmin();
  const sessionToken = randomToken(24);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const cred_sig = credentialsSignature();

  const { error } = await sb
    .from("admin_sessions")
    .insert([{ session_token: sessionToken, expires_at: expiresAt, cred_sig }]);
  if (error) {
    return NextResponse.json({ ok: false, message: "DB error" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, sessionToken, Math.floor(SESSION_TTL_MS / 1000));
  return res;
}
