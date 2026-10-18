import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/libs/supabase";
import { ADMIN_COOKIE, clearSessionCookie } from "@/libs/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest): Promise<NextResponse> {
  const jar = await cookies();
  const tok = jar.get(ADMIN_COOKIE)?.value;
  if (tok) {
    const sb = supabaseAdmin();
    await sb.from("admin_sessions").delete().eq("session_token", tok);
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
