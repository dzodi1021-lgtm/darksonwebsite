import { NextRequest, NextResponse } from "next/server";
import { canUseDashboard } from "@/libs/access";
import { stats, type Stats } from "@/libs/counters";

export const dynamic = "force-dynamic";

function range(value: string | null): Stats["range"] {
  return value === "day" || value === "week" || value === "month"
    ? value
    : "day";
}

export async function GET(request: NextRequest) {
  if (!canUseDashboard(request.headers)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    return NextResponse.json(await stats(range(request.nextUrl.searchParams.get("range"))), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not load analytics" }, { status: 502 });
  }
}
