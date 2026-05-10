"use client";

import { useState, type CSSProperties } from "react";
import { ActivityCard } from "@/components/ActivityCard";
import { Cursor } from "@/components/Cursor";
import { SpotifyCard } from "@/components/SpotifyCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ViewCounter } from "@/components/ViewCounter";
import { avatarUrl, type LanyardData } from "@/libs/lanyard";
import type { NameStyle, SiteConfig } from "@/libs/site-config";
import { useLanyard } from "@/hooks/useLanyard";
import styles from "./ProfileCard.module.css";

interface ProfileCardProps {
  initialData: LanyardData | null;
  settings: SiteConfig;
}

const nameStyles: Record<NameStyle, string> = {
  clean: styles.clean,
  glow: styles.glow,
  frost: styles.frost,
  chrome: styles.chrome,
  ghost: styles.ghost,
  pulse: styles.pulse,
  outline: styles.outline,
};

export function ProfileCard({ initialData, settings }: ProfileCardProps) {
  const { data } = useLanyard(initialData);
  const [copied, setCopied] = useState(false);

  const activities =
    data?.activities.filter((activity) => activity.type !== 2) || [];

  const displayName =
    settings.displayName ||
    data?.discord_user?.global_name ||
    data?.discord_user?.username ||
    "DarkSon";
  const username = settings.username || data?.discord_user?.username || "darkson";
  const avatar = settings.avatarUrl || avatarUrl(data?.discord_user, 256);
  const nameClass = [styles.name, nameStyles[settings.nameStyle] || styles.glow]
    .filter(Boolean)
    .join(" ");
  const shellStyle = settings.backgroundUrl
    ? ({
        "--profile-bg": `url("${settings.backgroundUrl.replaceAll('"', "%22")}")`,
      } as CSSProperties)
    : undefined;

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
    <main className={styles.shell} style={shellStyle}>
      <Cursor />
      <div className={styles.wrap}>
        <div className={styles.head}>
          <button
            type="button"
            onClick={copyUsername}
            className={styles.avatarButton}
            title="Click to copy username"
          >
            <img
              src={avatar}
              alt={`Discord avatar of ${displayName}`}
              width={96}
              height={96}
              className={styles.avatar}
            />

            {data && (
              <span
                className={styles.statusDot}
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
              <span className={styles.copy}>
                Copied!
              </span>
            )}
          </button>

          <div className={styles.info}>
            <h1 className={nameClass}>
              {displayName}
            </h1>
            <p className={styles.username}>
              @{username}
            </p>
            <div className={styles.meta}>
              {data && <StatusBadge status={data.discord_status} />}
              <ViewCounter />
            </div>
          </div>
        </div>

        <div className={styles.stack}>
          {settings.musicUrl && (
            <div className={styles.music}>
              <div>
                <p className={styles.musicKicker}>Page soundtrack</p>
                <p className={styles.musicTitle}>
                  {settings.musicTitle || "Custom track"}
                </p>
              </div>
              <audio className={styles.player} src={settings.musicUrl} controls loop />
            </div>
          )}

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
            <div className={styles.empty}>
              <p className={styles.emptyText}>
                Nothing is happening right now.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
