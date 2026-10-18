import crypto from "node:crypto";

export const KEY_PREFIX = "DARKSON";

export type DurationType = "1d" | "3d" | "7d" | "14d" | "30d" | "lifetime";

export const DURATIONS: DurationType[] = ["1d", "3d", "7d", "14d", "30d", "lifetime"];

export function durationToSeconds(type: string | null | undefined): number | null {
  switch (type) {
    case "1d":
      return 86_400;
    case "3d":
      return 3 * 86_400;
    case "7d":
      return 7 * 86_400;
    case "14d":
      return 14 * 86_400;
    case "30d":
      return 30 * 86_400;
    case "lifetime":
      return null;
    default:
      return null;
  }
}

function segment(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  return out;
}

export function generateKey(prefix: string = KEY_PREFIX): string {
  const head = String(prefix || KEY_PREFIX)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16) || KEY_PREFIX;

  return `${head}-${segment()}-${segment()}-${segment()}`;
}

// Compute effective status from DB fields (so dashboard never shows a
// 24h key as "active" after it has rotted — fixes the main complaint).
export function effectiveStatus(k: {
  status: string | null;
  expires_at: string | null;
  first_used_at: string | null;
  disabled_at: string | null;
  duration_type: string | null;
}): "unused" | "active" | "expired" | "disabled" {
  if (k.disabled_at) return "disabled";

  const now = Date.now();
  if (k.expires_at) {
    const ts = Date.parse(k.expires_at);
    if (Number.isFinite(ts) && ts < now) return "expired";
  }

  if (k.first_used_at) return "active";
  return "unused";
}

export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("hex");
}
