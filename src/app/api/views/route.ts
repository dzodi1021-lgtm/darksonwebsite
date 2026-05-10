import { NextRequest, NextResponse } from "next/server";
import { hit, total } from "@/libs/counters";

const COOKIE = "darkson_seen";
const YEAR = 60 * 60 * 24 * 365;

export const dynamic = "force-dynamic";

function remember(response: NextResponse) {
  response.cookies.set(COOKIE, "1", {
    httpOnly: true,
    maxAge: YEAR,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export async function GET() {
  try {
    return NextResponse.json(
      { views: await total(), counted: false },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json({ views: 0, counted: false }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const seen = request.cookies.get(COOKIE)?.value === "1";
    const views = seen ? await total() : await hit();
    const response = NextResponse.json(
      { views, counted: !seen },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

    return seen ? response : remember(response);
  } catch {
    return NextResponse.json({ views: 0, counted: false }, { status: 502 });
  }
}
