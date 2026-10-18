import { supabaseAdmin } from "./supabase";

/**
 * Marks every key whose `expires_at` is in the past as `expired`. This is
 * what fixes "les clés de 24h n'expirent jamais" — the dashboard was
 * trusting the `status` column, which was only updated on validate hits.
 *
 * Safe to call on every dashboard load and from the Vercel cron.
 */
export async function sweepExpiredKeys(): Promise<{ expired: number }> {
  const sb = supabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data, error } = await sb
    .from("keys")
    .update({ status: "expired" })
    .lt("expires_at", nowIso)
    .not("expires_at", "is", null)
    .neq("status", "expired")
    .is("disabled_at", null)
    .select("id");

  if (error) return { expired: 0 };
  return { expired: Array.isArray(data) ? data.length : 0 };
}

/**
 * Cleans up abandoned flow rows / expired admin sessions. Called by the
 * cron so nothing accumulates forever.
 */
export async function sweepStaleRows(): Promise<void> {
  const sb = supabaseAdmin();
  const nowIso = new Date().toISOString();
  await Promise.allSettled([
    sb.from("key_flows").delete().lt("expires_at", nowIso),
    sb.from("admin_sessions").delete().lt("expires_at", nowIso),
    sb
      .from("rate_hits")
      .delete()
      .lt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
  ]);
}
