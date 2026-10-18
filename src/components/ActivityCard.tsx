"use client";

import { useEffect, useState } from "react";
import { activityIcon, type LanyardActivity } from "@/hooks/useLanyard";

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
    <div className="rounded-xl border border-[var(--border)] bg-[#111111] p-4 hover-lift sm:p-5">
      <div className="flex items-center gap-4">
        {imageUrl && !iconFailed && (
          <img
            src={imageUrl}
            alt={activity.name}
            className="h-12 w-12 flex-shrink-0 rounded-lg object-cover sm:h-14 sm:w-14"
            onError={() => setIconFailed(true)}
          />
        )}
        {(!imageUrl || iconFailed) && emojiUrl && (
          <img
            src={emojiUrl}
            alt={activity.emoji?.name || "Activity emoji"}
            className="h-12 w-12 flex-shrink-0 rounded-lg bg-[#171717] object-cover p-2 sm:h-14 sm:w-14"
          />
        )}
        {(!imageUrl || iconFailed) && !emojiUrl && activity.emoji?.name && (
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-lg bg-[#171717] text-2xl sm:h-14 sm:w-14">
            <span aria-hidden="true">{activity.emoji.name}</span>
          </div>
        )}
        {(!imageUrl || iconFailed) && !emojiUrl && !activity.emoji?.name && (
          <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-lg bg-[#171717] text-lg font-semibold text-[var(--text-muted)] sm:h-14 sm:w-14">
            {fallback}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
            {label(activity.type)}
          </span>
          <p className="font-semibold truncate mt-0.5">{primaryText}</p>
          {activity.type === 4 && activity.details && (
            <p className="text-sm text-[var(--text-muted)] truncate">
              {activity.details}
            </p>
          )}
          {activity.type === 4 &&
            activity.name &&
            activity.name !== "Custom Status" && (
              <p className="text-sm text-[var(--text-muted)] truncate">
                {activity.name}
              </p>
            )}
          {activity.details &&
            (activity.type !== 4 ? (
              <p className="text-sm text-[var(--text-muted)] truncate">
                {activity.details}
              </p>
            ) : null)}
          {activity.state &&
            (activity.type !== 4 ? (
              <p className="text-sm text-[var(--text-muted)] truncate">
                {activity.state}
              </p>
            ) : null)}
        </div>

        {elapsed && (
          <span className="text-xs text-[var(--text-muted)] mono flex-shrink-0">
            {elapsed}
          </span>
        )}
      </div>
    </div>
  );
}
