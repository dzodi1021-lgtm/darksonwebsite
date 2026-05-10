"use client";

import { useState } from "react";
import { ActivityCard } from "@/components/ActivityCard";
import { Cursor } from "@/components/Cursor";
import { SpotifyCard } from "@/components/SpotifyCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ViewCounter } from "@/components/ViewCounter";
import { avatarUrl, type LanyardData } from "@/libs/lanyard";
import { useLanyard } from "@/hooks/useLanyard";
import styles from "./ProfileCard.module.css";

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
    <main className={styles.shell}>
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
            <h1 className={styles.name}>
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
