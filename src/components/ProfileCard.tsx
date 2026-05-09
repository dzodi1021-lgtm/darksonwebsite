"use client";

import { useState } from "react";
import { ActivityCard } from "@/components/ActivityCard";
import { Cursor } from "@/components/Cursor";
import { SpotifyCard } from "@/components/SpotifyCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ViewCounter } from "@/components/ViewCounter";
import { avatarUrl, type LanyardData } from "@/libs/lanyard";
import { useLanyard } from "@/hooks/useLanyard";

interface ProfileCardProps {
  initialData: LanyardData | null;
}

export function ProfileCard({ initialData }: ProfileCardProps) {
  const { data } = useLanyard(initialData);
  const [copied, setCopied] = useState(false);

  const activities =
    data?.activities.filter((activity) => activity.type !== 2) || [];

  const displayName =
    data?.discord_user?.global_name ||
    data?.discord_user?.username ||
    "DarkSon";
  const username = data?.discord_user?.username || "darkson";
  const avatar = avatarUrl(data?.discord_user, 256);

  const copyUsername = async () => {
    try {
      await navigator.clipboard.writeText(username);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = username;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <main className="relative isolate flex min-h-dvh items-start justify-center overflow-hidden px-3 py-6 sm:min-h-screen sm:items-center sm:p-6">
      <Cursor />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex items-center gap-4 sm:mb-10 sm:gap-5">
          <button
            type="button"
            onClick={copyUsername}
            className="group relative flex-shrink-0 cursor-pointer"
            title="Click to copy username"
          >
            <img
              src={avatar}
              alt={`Discord avatar of ${displayName}`}
              width={96}
              height={96}
              className="h-20 w-20 rounded-full object-cover transition-transform group-hover:scale-105 sm:h-24 sm:w-24"
            />

            {data && (
              <span
                className="absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-[3px] border-[var(--bg)] sm:bottom-1 sm:right-1 sm:h-5 sm:w-5"
                style={{
                  backgroundColor:
                    data.discord_status === "online"
                      ? "#22c55e"
                      : data.discord_status === "idle"
                        ? "#eab308"
                        : data.discord_status === "dnd"
                          ? "#ef4444"
                          : "#737373",
                }}
              />
            )}

            {copied && (
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded bg-[var(--accent)] px-2 py-1 text-xs text-black">
                Copied!
              </span>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              {displayName}
            </h1>
            <p className="mono mt-0.5 text-sm text-[var(--text-muted)] sm:mt-1">
              @{username}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 sm:mt-2">
              {data && <StatusBadge status={data.discord_status} />}
              <ViewCounter />
            </div>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {data?.listening_to_spotify && data.spotify && (
            <SpotifyCard spotify={data.spotify} />
          )}

          {activities.map((activity, index) => (
            <ActivityCard
              key={`${activity.name}-${index}`}
              activity={activity}
            />
          ))}

          {!data?.listening_to_spotify && activities.length === 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[#111111] p-4 text-center sm:p-6">
              <p className="text-sm text-[var(--text-muted)]">
                Nothing is happening right now.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
