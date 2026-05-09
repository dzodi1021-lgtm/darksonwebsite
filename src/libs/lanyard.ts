export interface LanyardSpotify {
  track_id: string;
  timestamps: {
    start: number;
    end: number;
  };
  song: string;
  artist: string;
  album_art_url: string;
  album: string;
}

export interface LanyardActivity {
  name: string;
  type: number;
  id?: string;
  sync_id?: string;
  session_id?: string;
  created_at?: number;
  flags?: number;
  state?: string;
  details?: string;
  emoji?: {
    id?: string;
    name?: string;
    animated?: boolean;
  };
  timestamps?: {
    start?: number;
    end?: number;
  };
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
  application_id?: string;
}

export interface LanyardClan {
  identity_guild_id: string;
  tag: string;
  badge: string;
  identity_enabled: boolean;
}

export interface LanyardData {
  spotify: LanyardSpotify | null;
  listening_to_spotify: boolean;
  discord_user: {
    id: string;
    username: string;
    avatar: string;
    discriminator: string;
    global_name: string | null;
    public_flags: number;
    clan?: LanyardClan | null;
    avatar_decoration_data?: {
      asset: string;
      sku_id: string;
    } | null;
  };
  discord_status: "online" | "idle" | "dnd" | "offline";
  activities: LanyardActivity[];
  active_on_discord_web: boolean;
  active_on_discord_desktop: boolean;
  active_on_discord_mobile: boolean;
}

interface RawLanyardDiscordUser {
  id?: string;
  username?: string;
  avatar?: string;
  discriminator?: string;
  global_name?: string | null;
  display_name?: string | null;
  public_flags?: number;
  clan?: LanyardClan | null;
  primary_guild?: LanyardClan | null;
  avatar_decoration_data?: {
    asset: string;
    sku_id: string;
  } | null;
}

export interface RawLanyardData {
  spotify?: LanyardSpotify | null;
  listening_to_spotify?: boolean;
  discord_user?: RawLanyardDiscordUser;
  discord_status?: "online" | "idle" | "dnd" | "offline";
  activities?: LanyardActivity[];
  active_on_discord_web?: boolean;
  active_on_discord_desktop?: boolean;
  active_on_discord_mobile?: boolean;
}

export const DEFAULT_DISCORD_ID = "1269246774103769121";
export const LANYARD_REST_URL = "https://api.lanyard.rest/v1/users";

const GAME_DOMAINS: Record<string, string> = {
  roblox: "roblox.com",
  valorant: "playvalorant.com",
  gta: "rockstargames.com",
  "grand theft auto": "rockstargames.com",
  minecraft: "minecraft.net",
  fortnite: "fortnite.com",
  "rocket league": "rocketleague.com",
  "league of legends": "leagueoflegends.com",
  "counter-strike": "counter-strike.net",
  "counter-strike 2": "counter-strike.net",
  "call of duty": "callofduty.com",
  overwatch: "overwatch.blizzard.com",
  "apex legends": "ea.com",
  "genshin impact": "genshin.hoyoverse.com",
  fivem: "fivem.net",
  steam: "store.steampowered.com",
  "visual studio code": "code.visualstudio.com",
};

function mod(value: string, divisor: number): number {
  let remainder = 0;

  for (const digit of value) {
    const number = Number.parseInt(digit, 10);

    if (!Number.isNaN(number)) {
      remainder = (remainder * 10 + number) % divisor;
    }
  }

  return remainder;
}

function defaultAvatar(id: string, discriminator?: string): number {
  if (discriminator && discriminator !== "0") {
    return Number.parseInt(discriminator, 10) % 5;
  }

  return mod(id, 6);
}

export function getLanyardUserId(): string {
  return process.env.NEXT_PUBLIC_LANYARD_USER_ID?.trim() || DEFAULT_DISCORD_ID;
}

export function avatarUrl(
  user?: LanyardData["discord_user"] | null,
  size = 256,
): string {
  if (!user) {
    return "https://cdn.discordapp.com/embed/avatars/0.png";
  }

  if (user.avatar) {
    const extension = user.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=${size}`;
  }

  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatar(
    user.id,
    user.discriminator,
  )}.png?size=${size}`;
}

function cdnAsset(activity: LanyardActivity, asset?: string) {
  if (!asset) {
    return null;
  }

  if (asset.startsWith("https://") || asset.startsWith("http://")) {
    return asset;
  }

  if (asset.startsWith("mp:external/")) {
    return `https://media.discordapp.net/external/${asset.replace("mp:external/", "")}`;
  }

  if (asset.startsWith("mp:")) {
    return `https://media.discordapp.net/${asset.slice(3)}`;
  }

  if (asset.startsWith("spotify:")) {
    return `https://i.scdn.co/image/${asset.slice("spotify:".length)}`;
  }

  if (activity.application_id) {
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${asset}.png`;
  }

  return null;
}

function gameDomain(name: string) {
  const lower = name.toLowerCase();
  const match = Object.entries(GAME_DOMAINS).find(([key]) =>
    lower.includes(key),
  );

  if (match) {
    return match[1];
  }

  const slug = lower
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join("");

  return slug ? `${slug}.com` : null;
}

export function activityIcon(activity: LanyardActivity): string | null {
  const image =
    cdnAsset(activity, activity.assets?.large_image) ||
    cdnAsset(activity, activity.assets?.small_image);

  if (image) {
    return image;
  }

  if (activity.type !== 0 && activity.type !== 1) {
    return null;
  }

  const domain = gameDomain(activity.name);

  return domain
    ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    : null;
}

export function getCustomStatus(
  activities?: LanyardActivity[] | null,
): LanyardActivity | null {
  return activities?.find((activity) => activity.type === 4) || null;
}

export function getCustomStatusText(
  status?: LanyardActivity | null,
): string | null {
  if (!status) {
    return null;
  }

  const parts = [status.emoji?.name, status.state].filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : null;
}

function findSpotify(activities: LanyardActivity[]) {
  return (
    activities.find(
      (activity) =>
        activity.type === 2 &&
        (activity.name === "Spotify" || activity.id?.startsWith("spotify:")),
    ) || null
  );
}

function spotifyArt(activity: LanyardActivity) {
  const largeImage = activity.assets?.large_image;

  if (largeImage?.startsWith("spotify:")) {
    return `https://i.scdn.co/image/${largeImage.slice("spotify:".length)}`;
  }

  return activityIcon(activity) || "";
}

function readSpotify(activity?: LanyardActivity | null) {
  if (!activity?.timestamps?.start || !activity.timestamps.end) {
    return null;
  }

  return {
    track_id: activity.sync_id || activity.id || "spotify",
    timestamps: {
      start: activity.timestamps.start,
      end: activity.timestamps.end,
    },
    song: activity.details || activity.assets?.large_text || activity.name,
    artist: activity.state || "Unknown artist",
    album_art_url: spotifyArt(activity),
    album: activity.assets?.large_text || activity.details || activity.name,
  };
}

export function normalizePresence(raw: RawLanyardData): LanyardData {
  const activities = Array.isArray(raw.activities) ? raw.activities : [];
  const spotify = raw.spotify || readSpotify(findSpotify(activities));
  const user = raw.discord_user;

  return {
    spotify,
    listening_to_spotify: Boolean(raw.listening_to_spotify) || Boolean(spotify),
    discord_user: {
      id: user?.id || DEFAULT_DISCORD_ID,
      username: user?.username || "unknown",
      avatar: user?.avatar || "",
      discriminator: user?.discriminator || "0",
      global_name: user?.global_name || user?.display_name || null,
      public_flags: user?.public_flags || 0,
      clan: user?.clan || user?.primary_guild || null,
      avatar_decoration_data: user?.avatar_decoration_data || null,
    },
    discord_status: raw.discord_status || "offline",
    activities,
    active_on_discord_web: Boolean(raw.active_on_discord_web),
    active_on_discord_desktop: Boolean(raw.active_on_discord_desktop),
    active_on_discord_mobile: Boolean(raw.active_on_discord_mobile),
  };
}

export const DISCORD_FLAGS = {
  STAFF: 1 << 0,
  PARTNER: 1 << 1,
  HYPESQUAD_EVENTS: 1 << 2,
  BUG_HUNTER_LEVEL_1: 1 << 3,
  HYPESQUAD_BRAVERY: 1 << 6,
  HYPESQUAD_BRILLIANCE: 1 << 7,
  HYPESQUAD_BALANCE: 1 << 8,
  EARLY_SUPPORTER: 1 << 9,
  BUG_HUNTER_LEVEL_2: 1 << 14,
  VERIFIED_BOT_DEVELOPER: 1 << 17,
  CERTIFIED_MODERATOR: 1 << 18,
  ACTIVE_DEVELOPER: 1 << 22,
} as const;

export function parseFlags(flags: number): string[] {
  const badges: string[] = [];

  if (flags & DISCORD_FLAGS.STAFF) badges.push("staff");
  if (flags & DISCORD_FLAGS.PARTNER) badges.push("partner");
  if (flags & DISCORD_FLAGS.HYPESQUAD_EVENTS) badges.push("hypesquad_events");
  if (flags & DISCORD_FLAGS.BUG_HUNTER_LEVEL_2) badges.push("bug_hunter_2");
  else if (flags & DISCORD_FLAGS.BUG_HUNTER_LEVEL_1)
    badges.push("bug_hunter_1");
  if (flags & DISCORD_FLAGS.HYPESQUAD_BRAVERY) badges.push("hypesquad_bravery");
  if (flags & DISCORD_FLAGS.HYPESQUAD_BRILLIANCE)
    badges.push("hypesquad_brilliance");
  if (flags & DISCORD_FLAGS.HYPESQUAD_BALANCE) badges.push("hypesquad_balance");
  if (flags & DISCORD_FLAGS.EARLY_SUPPORTER) badges.push("early_supporter");
  if (flags & DISCORD_FLAGS.VERIFIED_BOT_DEVELOPER)
    badges.push("verified_developer");
  if (flags & DISCORD_FLAGS.CERTIFIED_MODERATOR)
    badges.push("certified_moderator");
  if (flags & DISCORD_FLAGS.ACTIVE_DEVELOPER) badges.push("active_developer");

  return badges;
}
