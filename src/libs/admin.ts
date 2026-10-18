import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabase";
import { credentialsSignature } from "./workink";

export const ADMIN_COOKIE = "darkson_admin_session";

export interface AdminSession {
  session_token: string;
  expires_at: string;
  cred_sig: string | null;
}

/**
 * Returns the Supabase client when the current request carries a valid admin
 * session cookie; writes a 401 to the response and returns null otherwise.
 */
export async function requireAdmin(): Promise<SupabaseClient | null> {
  const sb = supabaseAdmin();
  const jar = await cookies();
  const tok = jar.get(ADMIN_COOKIE)?.value;
  if (!tok) return null;

  const { data, error } = await sb
    .from("admin_sessions")
    .select("*")
    .eq("session_token", tok)
    .limit(1);

  if (error || !data || data.length === 0) return null;
  const row = data[0] as AdminSession;

  if (new Date(row.expires_at) < new Date()) {
    // best-effort cleanup
    await sb.from("admin_sessions").delete().eq("session_token", tok);
    return null;
  }

  const curSig = credentialsSignature();
  if (row.cred_sig && row.cred_sig !== curSig) {
    await sb.from("admin_sessions").delete().eq("session_token", tok);
    return null;
  }

  return sb;
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
}

export function setSessionCookie(
  res: NextResponse,
  token: string,
  maxAgeSeconds: number,
) {
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeSeconds,
    path: "/",
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}
