import { NextResponse } from "next/server";
import { getInvite } from "@/libs/discord";

export const dynamic = "force-dynamic";

export async function GET() {
  const invite = await getInvite();

  return NextResponse.json(
    { invite },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
