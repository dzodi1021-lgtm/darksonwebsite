import { NextRequest, NextResponse } from "next/server";
import { canUseDashboard } from "@/libs/access";
import { getConfig, saveConfig } from "@/libs/site-config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getConfig(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function PUT(request: NextRequest) {
  if (!canUseDashboard(request.headers)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const config = await saveConfig(await request.json());

    return NextResponse.json(config, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not save dashboard settings",
      },
      { status: 500 },
    );
  }
}
