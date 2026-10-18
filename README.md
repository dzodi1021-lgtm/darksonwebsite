# darkson.xyz

Single Next.js project. Serves the vitrine on `/` and the Darkson key
system on `/key` + `/dashboard`.

## What lives where

| Path | What it is |
| --- | --- |
| `/` | The existing ProfileCard vitrine (Lanyard, Spotify, Discord, etc). Untouched visually. |
| `/key` | Public key-generation flow. `?step=0,1,2`. Antibypass intact. |
| `/key/goto-step1` | 302 → work.ink step 1, records the IP flow row. |
| `/key/goto-step2` | 302 → work.ink step 2 (only if step 1 completed). |
| `/dashboard` | Admin login + keys dashboard. ASTRA / Darkson mood. |
| `/api/key/validate` | **Roblox calls this.** POST `{ key, hwid, username, userId }`. |
| `/api/admin/login` | POST `{ username, password }` → cookie. |
| `/api/admin/logout` | POST, drops the session. |
| `/api/admin/me` | GET, 200 if authed. |
| `/api/admin/keys` | GET list / POST create. |
| `/api/admin/keys/[id]` | DELETE / PATCH `{ disabled }` / PATCH `{ reset_hwid: true }`. |
| `/api/admin/sweep` | Called every 15 min by Vercel Cron. Marks expired keys. |

Nothing on `/` references `/key` or `/dashboard`. The vitrine stays
untouched for anyone browsing darkson.xyz normally.

## Local dev

```bash
cp .env.example .env.local
# edit .env.local with real values (see below)
npm install
npm run dev
```

## Supabase — tables to create

Run this once in the Supabase SQL editor:

```sql
-- ============================================================
-- Darkson key system — schema
-- ============================================================

create table if not exists public.keys (
  id              bigserial primary key,
  key_value       text unique not null,
  status          text,
  duration_type   text not null default '1d',
  first_used_at   timestamptz,
  expires_at      timestamptz,
  hwid            text,
  roblox_username text,
  roblox_user_id  text,
  disabled_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists keys_key_value_idx    on public.keys (key_value);
create index if not exists keys_expires_at_idx   on public.keys (expires_at);
create index if not exists keys_status_idx       on public.keys (status);
create index if not exists keys_disabled_at_idx  on public.keys (disabled_at);

create table if not exists public.admin_sessions (
  id             bigserial primary key,
  session_token  text unique not null,
  expires_at     timestamptz not null,
  cred_sig       text,
  created_at     timestamptz not null default now()
);
create index if not exists admin_sessions_token_idx      on public.admin_sessions (session_token);
create index if not exists admin_sessions_expires_at_idx on public.admin_sessions (expires_at);

create table if not exists public.key_flows (
  ip_hash     text primary key,
  stage       int not null default 0,
  expires_at  timestamptz not null,
  updated_at  timestamptz not null default now()
);
create index if not exists key_flows_expires_at_idx on public.key_flows (expires_at);

-- Legacy table from the previous codebase. Kept so inserts from older
-- deployments still work; not used by this app.
create table if not exists public.keyflow_sessions (
  id          text primary key,
  step        int not null,
  ip_hash     text,
  ua_hash     text,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.rate_hits (
  id          bigserial primary key,
  bucket      text not null,
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists rate_hits_lookup_idx     on public.rate_hits (bucket, ip_hash, created_at);
create index if not exists rate_hits_created_at_idx on public.rate_hits (created_at);
```

RLS: leave it **disabled** on these tables. The app only connects with
the service-role key from server-side code; it never ships to the
browser.

## Vercel env vars

Set these on the project (Settings → Environment Variables → Production).
No value needs quoting.

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_LANYARD_USER_ID` | `1269246774103769121` |
| `NEXT_PUBLIC_SITE_URL` | `https://darkson.xyz` |
| `LRCLIB_API_BASE_URL` | `https://lrclib.net/api/get` |
| `LRCLIB_USER_AGENT` | `darkson-presence/1.0` |
| `COUNTER_API_BASE_URL` | `https://api.counterapi.dev/v1` |
| `VIEW_COUNTER_NAMESPACE` | `darksonwebsite` |
| `VIEW_COUNTER_NAME` | `views-v3` |
| `DISCORD_INVITE_CODE` | `soulcty` |
| `SUPABASE_URL` | *(your Supabase project URL)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Supabase service role key — paste from the chat, never commit)* |
| `ADMIN_USERNAME` | *(your dashboard username)* |
| `ADMIN_PASSWORD` | *(your dashboard password)* |
| `SESSION_SECRET` | A fresh `openssl rand -hex 48` value. **Required.** |
| `ADMIN_SESSION_TTL_DAYS` | `30` |
| `WORKINK_STEP1_URL` | your step 1 work.ink URL |
| `WORKINK_STEP2_URL` | your step 2 work.ink URL |
| `WORKINK_STEP1_LINK_ID` | *(optional, recommended)* numeric linkId of your step 1 — anti-bypass hardens with it set |
| `WORKINK_STEP2_LINK_ID` | *(optional, recommended)* same for step 2 |
| `CRON_SECRET` | A random string if you want to curl /api/admin/sweep manually |
| `NEXT_PUBLIC_DISCORD_INVITE` | `https://discord.gg/teh6H7q3v6` |

## Vercel domain

Point `darkson.xyz` (and `www.darkson.xyz`) at the Vercel project.
Both the vitrine and the dashboard are served from the same domain.

## Cron

`vercel.json` registers a cron: every 15 minutes Vercel will hit
`/api/admin/sweep` which marks every rotten key as `expired` and
cleans up abandoned flow rows / rate-limit entries. The dashboard also
sweeps on every GET of `/api/admin/keys`, so even without the cron
the dashboard never shows an outdated status.

## Updating the work.ink callback URLs

Both work.ink step links should redirect back to your site:

- Step 1 callback → `https://darkson.xyz/key?step=1`
- Step 2 callback → `https://darkson.xyz/key?step=2`

Make sure the work.ink dashboard sends the token as `?wk=…` (or
`?hash=…` / `?t=…` — the server accepts all three).

## Roblox side

```lua
local HttpService = game:GetService("HttpService")
local payload = HttpService:JSONEncode({
    key = yourKey,
    hwid = yourHwid,
    username = player.Name,
    userId = tostring(player.UserId),
})

local res = request({
    Url = "https://darkson.xyz/api/key/validate",
    Method = "POST",
    Headers = { ["Content-Type"] = "application/json" },
    Body = payload,
})

local data = HttpService:JSONDecode(res.Body)
if data.ok then
    -- unlock the UI
else
    warn("Key rejected:", data.message)
end
```

## Admin dashboard

- URL: `https://darkson.xyz/dashboard`
- Credentials: whatever you set in the `ADMIN_USERNAME` / `ADMIN_PASSWORD`
  env vars on Vercel.
- Keys expire on their own thanks to the sweep. If you want to kill a
  live key, use **Disable** (reversible) or **Delete** (final). HWID
  mismatches can be fixed with **Reset HWID** — the key goes back to
  the "unused" state and the next validate rebinds it.
