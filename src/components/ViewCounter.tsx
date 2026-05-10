"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

const SEEN_KEY = "darkson-view-seen-v3";

declare global {
  interface Window {
    darksonViewCount?: number;
    darksonViewJob?: Promise<number>;
  }
}

function shortNumber(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function seen() {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function saveSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    return;
  }
}

function loadViews() {
  if (window.darksonViewJob) {
    return window.darksonViewJob;
  }

  const method = seen() ? "GET" : "POST";

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

      if (method === "POST") {
        saveSeen();
      }

      window.darksonViewCount = views;

      return views;
    })
    .finally(() => {
      window.darksonViewJob = undefined;
    });

  return window.darksonViewJob;
}

interface ViewCounterProps {
  initialViews: number | null;
}

export function ViewCounter({ initialViews }: ViewCounterProps) {
  const [views, setViews] = useState<number | null>(
    typeof initialViews === "number" && initialViews > 0 ? initialViews : null,
  );

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
          setViews(window.darksonViewCount ?? initialViews ?? null);
        }
      });

    return () => {
      alive = false;
    };
  }, [initialViews]);

  return (
    <span className="view-counter mono" aria-label={`${views ?? initialViews ?? 0} profile views`}>
      <Eye className="view-counter-eye" aria-hidden="true" strokeWidth={2.2} />
      {views !== null && <span>{shortNumber(views)}</span>}
    </span>
  );
}
