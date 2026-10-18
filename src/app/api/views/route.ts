import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  readViews,
  VIEW_COOKIE_AGE,
  VIEW_COOKIE_NAME,
  VIEW_COUNTER_NAME,
} from "@/libs/views";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const views = await readViews();

    return NextResponse.json(
      { views },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json({ views: 0 }, { status: 502 });
  }
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const alreadySeen = cookieStore.get(VIEW_COOKIE_NAME)?.value === VIEW_COUNTER_NAME;
    const views = await readViews(alreadySeen ? undefined : "up");
    const response = NextResponse.json(
      { views },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

    if (!alreadySeen) {
      response.cookies.set(VIEW_COOKIE_NAME, VIEW_COUNTER_NAME, {
        httpOnly: true,
        maxAge: VIEW_COOKIE_AGE,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return response;
  } catch {
    return NextResponse.json({ views: 0 }, { status: 502 });
  }
}
