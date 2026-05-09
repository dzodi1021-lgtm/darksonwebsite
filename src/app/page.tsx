"use client";

import { ActivityCard } from "@/components/ActivityCard";
import { Cursor } from "@/components/Cursor";
import { SpotifyCard } from "@/components/SpotifyCard";
import { StatusBadge } from "@/components/StatusBadge";
import { avatarUrl, useLanyard } from "@/hooks/useLanyard";
import { useState } from "react";

export default function Home() {
  const { data } = useLanyard();
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
        <div className="flex items-center gap-4 sm:gap-5 mb-8 sm:mb-10">
          <button
            type="button"
            onClick={copyUsername}
            className="relative flex-shrink-0 group cursor-pointer"
            title="Click to copy username"
          >
            <img
              src={avatar}
              alt={`Avatar Discord de ${displayName}`}
              width={96}
              height={96}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover transition-transform group-hover:scale-105"
            />

            {data && (
              <span
                className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-[3px] border-[var(--bg)]"
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
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-[var(--accent)] text-black px-2 py-1 rounded">
                Copied!
              </span>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight truncate">
              {displayName}
            </h1>
            <p className="text-[var(--text-muted)] mono text-sm mt-0.5 sm:mt-1">
              @{username}
            </p>
            <div className="mt-1.5 sm:mt-2">
              {data && <StatusBadge status={data.discord_status} />}
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
              <p className="text-[var(--text-muted)] text-sm">
                Nothing is happening right now.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
