import { supabaseAdmin } from "./supabase";
import { sha256Hex } from "./ip";

/**
 * Dead-simple sliding-window rate limiter backed by Supabase. Keyed by
 * (bucket, ip_hash). Lets through up to `limit` hits per `windowSec`.
 *
 * Requires the `rate_hits` table (see README SQL).
 */
export async function rateLimit(opts: {
  bucket: string;
  ip: string;
  limit: number;
  windowSec: number;
}): Promise<{ ok: boolean; remaining: number; retryAfter: number }> {
  const { bucket, ip, limit, windowSec } = opts;
  const sb = supabaseAdmin();
  const ipHash = sha256Hex(ip);
  const now = Date.now();
  const windowStart = new Date(now - windowSec * 1000).toISOString();

  // 1. count hits inside window
  const { count, error } = await sb
    .from("rate_hits")
    .select("id", { count: "exact", head: true })
    .eq("bucket", bucket)
    .eq("ip_hash", ipHash)
    .gte("created_at", windowStart);

  if (error) {
    // Fail-open — never let the limiter block real users if the DB hiccups.
    return { ok: true, remaining: limit, retryAfter: 0 };
  }

  const used = count || 0;

  if (used >= limit) {
    // find oldest hit still in window to compute retry
    const { data: oldest } = await sb
      .from("rate_hits")
      .select("created_at")
      .eq("bucket", bucket)
      .eq("ip_hash", ipHash)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: true })
      .limit(1);
    const retryAfter =
      oldest && oldest[0]
        ? Math.max(
            1,
            Math.ceil(
              (Date.parse(oldest[0].created_at) + windowSec * 1000 - now) / 1000,
            ),
          )
        : windowSec;
    return { ok: false, remaining: 0, retryAfter };
  }

  // 2. record this hit
  await sb.from("rate_hits").insert({
    bucket,
    ip_hash: ipHash,
    created_at: new Date(now).toISOString(),
  });

  // 3. opportunistic cleanup (every ~1 in 20 calls)
  if (Math.random() < 0.05) {
    const cutoff = new Date(now - windowSec * 1000 * 3).toISOString();
    await sb.from("rate_hits").delete().lt("created_at", cutoff);
  }

  return { ok: true, remaining: Math.max(0, limit - used - 1), retryAfter: 0 };
}
