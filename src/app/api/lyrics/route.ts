import { NextRequest, NextResponse } from "next/server";
import {
  parsePlainLyrics,
  parseSyncedLyrics,
  type LyricsPayload,
} from "@/libs/lyrics";

interface LrclibResponse {
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

const lyricsCache = new Map<string, LyricsPayload>();
const lyricsJobs = new Map<string, Promise<LyricsPayload>>();
const LRCLIB_API_BASE_URL =
  process.env.LRCLIB_API_BASE_URL?.trim() || "https://lrclib.net/api/get";
const LRCLIB_USER_AGENT =
  process.env.LRCLIB_USER_AGENT?.trim() || "darkson-presence/1.0";

export const dynamic = "force-dynamic";

function buildLyricsPayload(payload?: LrclibResponse | null): LyricsPayload {
  const synced = parseSyncedLyrics(payload?.syncedLyrics);
  const plain = parsePlainLyrics(payload?.plainLyrics);

  return {
    found:
      Boolean(payload) &&
      (synced.length > 0 || plain.length > 0 || Boolean(payload?.instrumental)),
    instrumental: Boolean(payload?.instrumental),
    synced,
    plain,
    provider: "lrclib",
  };
}

function appendSearchParam(
  params: URLSearchParams,
  key: string,
  value?: string | number | null,
) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  params.set(key, String(value));
}

function cacheKey(params: URLSearchParams): string {
  return [
    params.get("song") || "",
    params.get("artist") || "",
    params.get("album") || "",
    params.get("durationMs") || "",
  ]
    .join("|")
    .toLowerCase();
}

function searchParamsFor(attempt: {
  track_name: string;
  artist_name: string;
  album_name?: string | null;
  duration?: number;
}) {
  const params = new URLSearchParams();

  appendSearchParam(params, "track_name", attempt.track_name);
  appendSearchParam(params, "artist_name", attempt.artist_name);
  appendSearchParam(params, "album_name", attempt.album_name);
  appendSearchParam(params, "duration", attempt.duration);

  return params;
}

async function fetchLyricsAttempt(
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<LrclibResponse | null> {
  const response = await fetch(`${LRCLIB_API_BASE_URL}?${params.toString()}`, {
    cache: "no-store",
    signal,
    headers: {
      Accept: "application/json",
      "User-Agent": LRCLIB_USER_AGENT,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Lyrics lookup failed with status ${response.status}`);
  }

  return (await response.json()) as LrclibResponse;
}

async function findLyrics(
  attempts: Array<{
    track_name: string;
    artist_name: string;
    album_name?: string | null;
    duration?: number;
  }>,
) {
  let firstError: unknown = null;
  const pending = attempts.map((attempt, id) => {
    const controller = new AbortController();
    const promise = fetchLyricsAttempt(
      searchParamsFor(attempt),
      controller.signal,
    )
      .then((value) => ({ id, value, error: null }))
      .catch((error: unknown) => ({ id, value: null, error }));

    return { id, controller, promise };
  });

  while (pending.length > 0) {
    const result = await Promise.race(pending.map((entry) => entry.promise));
    const doneIndex = pending.findIndex((entry) => entry.id === result.id);

    if (doneIndex >= 0) {
      pending.splice(doneIndex, 1);
    }

    if (result.value) {
      for (const entry of pending) {
        entry.controller.abort();
      }

      return result.value;
    }

    if (result.error && !firstError) {
      firstError = result.error;
    }
  }

  if (firstError) {
    throw firstError;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const key = cacheKey(searchParams);

  const song = searchParams.get("song")?.trim();
  const artist = searchParams.get("artist")?.trim();
  const album = searchParams.get("album")?.trim();
  const durationMs = Number.parseInt(searchParams.get("durationMs") || "0", 10);
  const durationSeconds =
    Number.isFinite(durationMs) && durationMs > 0
      ? Math.round(durationMs / 1000)
      : undefined;

  if (!song || !artist) {
    return NextResponse.json(
      { error: "Missing song or artist parameter." },
      { status: 400 },
    );
  }

  const cached = lyricsCache.get(key);

  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "X-Lyrics-Cache": "HIT",
      },
    });
  }

  const attempts = [
    {
      track_name: song,
      artist_name: artist,
      album_name: album,
      duration: durationSeconds,
    },
    {
      track_name: song,
      artist_name: artist,
      duration: durationSeconds,
    },
    {
      track_name: song,
      artist_name: artist,
    },
  ];

  let startedJob = false;

  try {
    const runningJob = lyricsJobs.get(key);

    if (runningJob) {
      const payload = await runningJob;

      return NextResponse.json(payload, {
        headers: {
          "Cache-Control": "public, max-age=3600",
          "X-Lyrics-Cache": "WAIT",
        },
      });
    }

    const job = findLyrics(attempts).then((result) =>
      buildLyricsPayload(result),
    );

    lyricsJobs.set(key, job);
    startedJob = true;

    const payload = await job;
    lyricsCache.set(key, payload);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "X-Lyrics-Cache": "MISS",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to fetch lyrics right now." },
      { status: 502 },
    );
  } finally {
    if (startedJob) {
      lyricsJobs.delete(key);
    }
  }
}
