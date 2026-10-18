import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/libs/admin";
import { sweepExpiredKeys, sweepStaleRows } from "@/libs/sweep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Called by:
 *  - Vercel Cron (`vercel.json`) with the `x-vercel-cron: 1` header.
 *  - A manual CRON_SECRET bearer call.
 *  - An authenticated admin, as a "sweep now" button.
 */
async function run(req: NextRequest): Promise<NextResponse> {
  const cronHeader = req.headers.get("x-vercel-cron");
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  const secret = process.env.CRON_SECRET || "";

  const isCron = Boolean(cronHeader);
  const isSecret = secret && bearer && bearer === secret;

  if (!isCron && !isSecret) {
    const sb = await requireAdmin();
    if (!sb) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }
  }

  const { expired } = await sweepExpiredKeys();
  await sweepStaleRows();
  return NextResponse.json({ ok: true, expired });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return run(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return run(req);
}
