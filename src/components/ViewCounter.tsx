"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    darksonViewCount?: number;
    darksonViewDone?: boolean;
    darksonViewJob?: Promise<number>;
  }
}

function shortNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function loadViews() {
  if (window.darksonViewJob) {
    return window.darksonViewJob;
  }

  const method = window.darksonViewDone ? "GET" : "POST";

  window.darksonViewJob = fetch("/api/views", {
    method,
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("View counter failed");
      }

      const payload = (await response.json()) as { views?: number };
      const views = Number(payload.views) || 0;

      window.darksonViewDone = true;
      window.darksonViewCount = views;

      return views;
    })
    .finally(() => {
      window.darksonViewJob = undefined;
    });

  return window.darksonViewJob;
}

export function ViewCounter() {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    if (typeof window.darksonViewCount === "number") {
      setViews(window.darksonViewCount);
    }

    loadViews()
      .then((nextViews) => {
        if (alive) {
          setViews(nextViews);
        }
      })
      .catch(() => {
        if (alive) {
          setViews(window.darksonViewCount ?? 0);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <span className="view-counter mono">
      <span className="view-counter-dot" aria-hidden="true" />
      {views === null ? "Views -" : `${shortNumber(views)} views`}
    </span>
  );
}
