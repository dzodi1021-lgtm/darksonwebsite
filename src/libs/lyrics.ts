export interface LyricsLine {
  startTimeMs: number;
  text: string;
}

export interface LyricsPayload {
  found: boolean;
  instrumental: boolean;
  synced: LyricsLine[];
  plain: string[];
  provider: "lrclib";
}

const TIMESTAMP_REGEX = /\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g;

function parseTimestamp(
  minutesRaw: string,
  secondsRaw: string,
  fractionRaw?: string,
): number {
  const minutes = Number.parseInt(minutesRaw, 10);
  const seconds = Number.parseInt(secondsRaw, 10);
  const milliseconds = Number.parseInt(
    fractionRaw ? fractionRaw.padEnd(3, "0").slice(0, 3) : "0",
    10,
  );

  return (minutes * 60 + seconds) * 1000 + milliseconds;
}

export function parseSyncedLyrics(lyrics?: string | null): LyricsLine[] {
  if (!lyrics) {
    return [];
  }

  const lines: LyricsLine[] = [];

  for (const rawLine of lyrics.split(/\r?\n/)) {
    const matches = [...rawLine.matchAll(TIMESTAMP_REGEX)];
    const text = rawLine.replace(TIMESTAMP_REGEX, "").trim();

    if (matches.length === 0 || !text) {
      continue;
    }

    for (const match of matches) {
      lines.push({
        startTimeMs: parseTimestamp(match[1], match[2], match[3]),
        text,
      });
    }
  }

  return lines.sort((left, right) => left.startTimeMs - right.startTimeMs);
}

export function parsePlainLyrics(lyrics?: string | null): string[] {
  if (!lyrics) {
    return [];
  }

  return lyrics
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function findCurrentLyricIndex(
  lines: LyricsLine[],
  currentTimeMs: number,
): number {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (currentTimeMs >= lines[index].startTimeMs) {
      return index;
    }
  }

  return -1;
}
