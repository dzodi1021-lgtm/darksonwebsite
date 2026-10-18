import { NextResponse } from "next/server";
import { requireAdmin, unauthorized } from "@/libs/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const sb = await requireAdmin();
  if (!sb) return unauthorized();
  return NextResponse.json({ ok: true });
}
