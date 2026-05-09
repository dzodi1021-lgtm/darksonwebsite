"use client";

import { parseFlags, type LanyardClan } from "@/hooks/useLanyard";

interface DiscordBadgesProps {
  flags: number;
  clan?: LanyardClan | null;
}

const BADGE_ICONS: Record<string, { icon: string; label: string }> = {
  staff: {
    icon: "https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png",
    label: "Discord Staff",
  },
  partner: {
    icon: "https://cdn.discordapp.com/badge-icons/3f9748e53446a137a052f3454e2de41e.png",
    label: "Partnered Server Owner",
  },
  hypesquad_events: {
    icon: "https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png",
    label: "HypeSquad Events",
  },
  bug_hunter_1: {
    icon: "https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png",
    label: "Bug Hunter",
  },
  bug_hunter_2: {
    icon: "https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png",
    label: "Bug Hunter Level 2",
  },
  hypesquad_bravery: {
    icon: "https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png",
    label: "HypeSquad Bravery",
  },
  hypesquad_brilliance: {
    icon: "https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png",
    label: "HypeSquad Brilliance",
  },
  hypesquad_balance: {
    icon: "https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png",
    label: "HypeSquad Balance",
  },
  early_supporter: {
    icon: "https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png",
    label: "Early Supporter",
  },
  verified_developer: {
    icon: "https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4f0d.png",
    label: "Early Verified Bot Developer",
  },
  certified_moderator: {
    icon: "https://cdn.discordapp.com/badge-icons/fee1624003e2fee35cb398e125dc479b.png",
    label: "Discord Certified Moderator",
  },
  active_developer: {
    icon: "https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png",
    label: "Active Developer",
  },
};

export function DiscordBadges({ flags, clan }: DiscordBadgesProps) {
  const badges = parseFlags(flags);

  if (badges.length === 0 && !clan) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Clan tag */}
      {clan && clan.tag && (
        <div className="flex items-center gap-1 bg-[#1a1a1a] px-2 py-0.5 rounded text-xs">
          {clan.badge && (
            <img
              src={`https://cdn.discordapp.com/clan-badges/${clan.identity_guild_id}/${clan.badge}.png?size=16`}
              alt=""
              className="w-4 h-4"
            />
          )}
          <span className="text-[var(--text-muted)] font-medium">{clan.tag}</span>
        </div>
      )}

      {/* Badges */}
      {badges.map((badge) => {
        const badgeInfo = BADGE_ICONS[badge];
        if (!badgeInfo) return null;

        return (
          <img
            key={badge}
            src={badgeInfo.icon}
            alt={badgeInfo.label}
            title={badgeInfo.label}
            className="w-5 h-5"
          />
        );
      })}
    </div>
  );
}
