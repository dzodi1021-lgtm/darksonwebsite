import crypto from "node:crypto";

export interface WorkinkInfo {
  linkId?: string | number;
  byIp?: string;
  [k: string]: unknown;
}

export interface WorkinkCheck {
  ok: boolean;
  reason?:
    | "missing_token"
    | "workink_unreachable"
    | "invalid_token"
    | "wrong_link"
    | "ip_mismatch";
  info?: WorkinkInfo;
}

/**
 * Verify a work.ink one-shot token. Keeps the single-use (deleteToken=1)
 * contract so a leaked token can't be replayed.
 *
 * The anti-bypass behaviour is intentionally identical to the previous
 * implementation (ip match + linkId match when set) — DO NOT weaken this.
 */
export async function verifyWorkinkToken(opts: {
  token: string;
  expectedLinkId?: string;
  clientIp?: string;
  deleteToken?: boolean;
  timeoutMs?: number;
}): Promise<WorkinkCheck> {
  const { token, expectedLinkId, clientIp, deleteToken = true, timeoutMs = 8000 } = opts;

  if (!token || typeof token !== "string") {
    return { ok: false, reason: "missing_token" };
  }

  const base = `https://work.ink/_api/v2/token/isValid/${encodeURIComponent(token)}`;
  const url = deleteToken ? `${base}?deleteToken=1` : base;

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);

  let data: { valid?: boolean; info?: WorkinkInfo } | null = null;
  try {
    const r = await fetch(url, { method: "GET", signal: ac.signal });
    data = await r.json().catch(() => null);
  } catch {
    clearTimeout(t);
    return { ok: false, reason: "workink_unreachable" };
  } finally {
    clearTimeout(t);
  }

  if (!data || data.valid !== true || !data.info) {
    return { ok: false, reason: "invalid_token" };
  }

  if (expectedLinkId && String(expectedLinkId).trim() !== "") {
    const exp = Number(expectedLinkId);
    if (Number.isFinite(exp) && Number(data.info.linkId) !== exp) {
      return { ok: false, reason: "wrong_link" };
    }
  }

  if (clientIp && data.info.byIp) {
    const a = String(data.info.byIp).trim().replace(/^::ffff:/, "");
    const b = String(clientIp).trim().replace(/^::ffff:/, "");
    if (a && b && a !== b) {
      return { ok: false, reason: "ip_mismatch" };
    }
  }

  return { ok: true, info: data.info };
}

/**
 * Signature of (username, password, secret) — used to invalidate every
 * admin session as soon as the ADMIN_PASSWORD env is rotated.
 */
export function credentialsSignature(): string {
  const u = process.env.ADMIN_USERNAME || "admin";
  const p = process.env.ADMIN_PASSWORD || "change_me";
  const secret = process.env.SESSION_SECRET || "default_secret_change_me";
  return crypto.createHmac("sha256", secret).update(`${u}:${p}`).digest("hex");
}

/**
 * Constant-time string comparison. Prevents timing-based username/password
 * guessing on the admin login endpoint.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a || ""), "utf8");
  const bufB = Buffer.from(String(b || ""), "utf8");
  if (bufA.length !== bufB.length) {
    // still do a timing-safe compare to avoid early return leak
    const pad = Buffer.alloc(Math.max(bufA.length, bufB.length));
    crypto.timingSafeEqual(pad, pad);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
