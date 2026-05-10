"use client";

import { useEffect, useState } from "react";
import type { InviteData } from "@/libs/discord";

interface DiscordInviteCardProps {
  initialInvite: InviteData | null;
}

function count(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function serverIcon(invite: InviteData) {
  if (invite.iconUrl) {
    return (
      <img
        src={invite.iconUrl}
        alt={`${invite.name} server icon`}
        width={72}
        height={72}
        className="h-16 w-16 rounded-2xl object-cover shadow-[0_16px_38px_rgba(0,0,0,0.25)] sm:h-[72px] sm:w-[72px]"
      />
    );
  }

  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-semibold text-white shadow-[0_16px_38px_rgba(0,0,0,0.25)] sm:h-[72px] sm:w-[72px]">
      {invite.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function DiscordInviteCard({ initialInvite }: DiscordInviteCardProps) {
  const [invite, setInvite] = useState(initialInvite);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const response = await fetch("/api/discord-invite", { cache: "no-store" });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { invite?: InviteData | null };

        if (alive && payload.invite) {
          setInvite(payload.invite);
        }
      } catch {
        return;
      }
    }

    load();
    const timer = window.setInterval(load, 60_000);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  if (!invite) {
    return null;
  }

  return (
    <a
      className="discord-card group"
      href={invite.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Join ${invite.name} on Discord`}
    >
      <span className="discord-label" aria-hidden="true">
        Discord
      </span>
      <div className="relative z-10 flex items-center gap-3 pr-20 sm:gap-4 sm:pr-24">
        {serverIcon(invite)}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold leading-tight text-white sm:text-xl">
            {invite.name}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-white/72 sm:text-sm">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#42d66a] shadow-[0_0_12px_rgba(66,214,106,0.7)]" />
              {count(invite.online)} Online
            </span>
            <span>{count(invite.members)} Members</span>
          </div>
        </div>
      </div>
      <span className="discord-join">Join</span>
    </a>
  );
}
