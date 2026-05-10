import { NextResponse } from "next/server";

interface CounterPayload {
  count?: number;
}

const COUNTER_API_BASE_URL =
  process.env.COUNTER_API_BASE_URL?.trim() || "https://api.counterapi.dev/v1";
const VIEW_COUNTER_NAMESPACE =
  process.env.VIEW_COUNTER_NAMESPACE?.trim() || "darksonwebsite";
const VIEW_COUNTER_NAME =
  process.env.VIEW_COUNTER_NAME?.trim() ||
  (process.env.NODE_ENV === "development" ? "views-dev" : "views");

export const dynamic = "force-dynamic";

function counterUrl(action?: "up") {
  const namespace = encodeURIComponent(VIEW_COUNTER_NAMESPACE);
  const name = encodeURIComponent(VIEW_COUNTER_NAME);
  const suffix = action ? `/${action}` : "";

  return `${COUNTER_API_BASE_URL}/${namespace}/${name}${suffix}`;
}

async function read(action?: "up") {
  const response = await fetch(counterUrl(action), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404) {
    return 0;
  }

  if (!response.ok) {
    throw new Error("Counter request failed");
  }

  const payload = (await response.json()) as CounterPayload;

  return Number.isFinite(payload.count) ? Number(payload.count) : 0;
}

export async function GET() {
  try {
    const views = await read();

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
    const views = await read("up");

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
