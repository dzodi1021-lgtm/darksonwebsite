"use client";

import { useEffect, useState } from "react";
import { activityIcon, type LanyardActivity } from "@/hooks/useLanyard";
import styles from "./ActivityCard.module.css";

interface ActivityCardProps {
  activity: LanyardActivity;
}

function label(type: number): string {
  switch (type) {
    case 0:
      return "Playing";
    case 1:
      return "Streaming";
    case 2:
      return "Listening";
    case 3:
      return "Watching";
    case 4:
      return "Custom status";
    case 5:
      return "Competing";
    default:
      return "Activity";
  }
}

function emoji(activity: LanyardActivity): string | null {
  if (!activity.emoji?.id) {
    return null;
  }

  const extension = activity.emoji.animated ? "gif" : "png";
  return `https://cdn.discordapp.com/emojis/${activity.emoji.id}.${extension}?size=96&quality=lossless`;
}

function time(start?: number): string {
  if (!start) {
    return "";
  }

  const elapsed = Date.now() - start;
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes} min`;
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const [elapsed, setElapsed] = useState(() =>
    time(activity.timestamps?.start),
  );
  const [iconFailed, setIconFailed] = useState(false);

  useEffect(() => {
    if (!activity.timestamps?.start) {
      return;
    }

    const interval = setInterval(() => {
      setElapsed(time(activity.timestamps?.start));
    }, 60000);

    return () => clearInterval(interval);
  }, [activity.timestamps?.start]);

  useEffect(() => {
    setIconFailed(false);
  }, [
    activity.name,
    activity.assets?.large_image,
    activity.assets?.small_image,
  ]);

  const imageUrl = activityIcon(activity);
  const emojiUrl = emoji(activity);
  const primaryText =
    activity.type === 4 ? activity.state || "Custom status" : activity.name;
  const fallback = primaryText.charAt(0).toUpperCase();

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        {imageUrl && !iconFailed && (
          <img
            src={imageUrl}
            alt={activity.name}
            className={styles.icon}
            onError={() => setIconFailed(true)}
          />
        )}
        {(!imageUrl || iconFailed) && emojiUrl && (
          <img
            src={emojiUrl}
            alt={activity.emoji?.name || "Activity emoji"}
            className={styles.emojiIcon}
          />
        )}
        {(!imageUrl || iconFailed) && !emojiUrl && activity.emoji?.name && (
          <div className={styles.emojiBox}>
            <span aria-hidden="true">{activity.emoji.name}</span>
          </div>
        )}
        {(!imageUrl || iconFailed) && !emojiUrl && !activity.emoji?.name && (
          <div className={styles.fallbackBox}>
            {fallback}
          </div>
        )}

        <div className={styles.body}>
          <span className={styles.label}>
            {label(activity.type)}
          </span>
          <p className={styles.title}>{primaryText}</p>
          {activity.type === 4 && activity.details && (
            <p className={styles.line}>
              {activity.details}
            </p>
          )}
          {activity.type === 4 &&
            activity.name &&
            activity.name !== "Custom Status" && (
              <p className={styles.line}>
                {activity.name}
              </p>
            )}
          {activity.details &&
            (activity.type !== 4 ? (
              <p className={styles.line}>
                {activity.details}
              </p>
            ) : null)}
          {activity.state &&
            (activity.type !== 4 ? (
              <p className={styles.line}>
                {activity.state}
              </p>
            ) : null)}
        </div>

        {elapsed && (
          <span className={styles.time}>
            {elapsed}
          </span>
        )}
      </div>
    </div>
  );
}
