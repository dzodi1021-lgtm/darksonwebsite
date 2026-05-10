export interface InviteData {
  name: string;
  iconUrl: string | null;
  online: number;
  members: number;
  url: string;
}

interface RawInvite {
  code?: string;
  approximate_member_count?: number;
  approximate_presence_count?: number;
  guild?: {
    id?: string;
    name?: string;
    icon?: string | null;
  };
}

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";
const DEFAULT_INVITE_CODE = "shibumi";

function inviteCode() {
  const value =
    process.env.DISCORD_INVITE_CODE?.trim() ||
    process.env.DISCORD_INVITE_URL?.trim() ||
    DEFAULT_INVITE_CODE;

  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);

    return parts.at(-1) || DEFAULT_INVITE_CODE;
  } catch {
    return value.replace(/^discord\.gg\//i, "") || DEFAULT_INVITE_CODE;
  }
}

function iconUrl(guild: RawInvite["guild"]) {
  if (!guild?.id || !guild.icon) {
    return null;
  }

  const ext = guild.icon.startsWith("a_") ? "gif" : "png";

  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${ext}?size=160`;
}

export async function getInvite(): Promise<InviteData | null> {
  const code = inviteCode();
  const response = await fetch(
    `${DISCORD_API_BASE_URL}/invites/${encodeURIComponent(code)}?with_counts=true&with_expiration=true`,
    {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as RawInvite;

  return {
    name: data.guild?.name || "Shibumi",
    iconUrl: iconUrl(data.guild),
    online: data.approximate_presence_count || 0,
    members: data.approximate_member_count || 0,
    url: `https://discord.gg/${data.code || code}`,
  };
}
