"use client";

import { useEffect, useMemo, useState } from "react";
import type { LanyardData } from "@/hooks/useLanyard";

interface LanyardDebugCardProps {
  websocketData: LanyardData | null;
  websocketConnected: boolean;
}

interface LanyardRestResponse {
  success: boolean;
  data?: LanyardData;
  error?: string;
}

const DEFAULT_DISCORD_ID = "1269246774103769121";
const LANYARD_USER_ID =
  process.env.NEXT_PUBLIC_LANYARD_USER_ID?.trim() || DEFAULT_DISCORD_ID;

function formatTimestamp(value?: number): string {
  if (!value) {
    return "n/a";
  }

  return new Date(value).toLocaleTimeString("fr-FR");
}

export function LanyardDebugCard({
  websocketData,
  websocketConnected,
}: LanyardDebugCardProps) {
  const [restPayload, setRestPayload] = useState<LanyardRestResponse | null>(
    null,
  );
  const [restLoading, setRestLoading] = useState(true);
  const [restError, setRestError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        setRestLoading(true);
        setRestError(null);

        const response = await fetch(
          `https://api.lanyard.rest/v1/users/${LANYARD_USER_ID}`,
          {
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as LanyardRestResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.success) {
          setRestPayload(payload);
          setRestError(payload.error || "REST error");
          return;
        }

        setRestPayload(payload);
        setLastRefreshAt(Date.now());
      } catch {
        if (!cancelled) {
          setRestError("Impossible de charger le REST Lanyard.");
        }
      } finally {
        if (!cancelled) {
          setRestLoading(false);
        }
      }
    }

    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const websocketSummary = useMemo(
    () => ({
      spotify: Boolean(websocketData?.listening_to_spotify),
      activities: websocketData?.activities.length || 0,
      status: websocketData?.discord_status || "n/a",
      song: websocketData?.spotify?.song || "aucune",
      artist: websocketData?.spotify?.artist || "aucun",
    }),
    [websocketData],
  );

  const restSummary = useMemo(
    () => ({
      spotify: Boolean(restPayload?.data?.listening_to_spotify),
      activities: restPayload?.data?.activities.length || 0,
      status: restPayload?.data?.discord_status || "n/a",
      song: restPayload?.data?.spotify?.song || "aucune",
      artist: restPayload?.data?.spotify?.artist || "aucun",
    }),
    [restPayload],
  );

  return (
    <div className="border border-[#3a3120] rounded-xl p-5 bg-[#15110b]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#d0b07c]">
            Debug Lanyard
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Compare le websocket et le REST en direct pour Spotify et les
            activites.
          </p>
        </div>
        <span className="mono text-xs text-[var(--text-muted)]">
          refresh: {lastRefreshAt ? formatTimestamp(lastRefreshAt) : "n/a"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[#0f0f0f] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
            Websocket
          </p>
          <div className="mt-3 space-y-1.5 text-sm">
            <p>connecte: {websocketConnected ? "oui" : "non"}</p>
            <p>spotify: {websocketSummary.spotify ? "oui" : "non"}</p>
            <p>activites: {websocketSummary.activities}</p>
            <p>status: {websocketSummary.status}</p>
            <p>song: {websocketSummary.song}</p>
            <p>artist: {websocketSummary.artist}</p>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[#0f0f0f] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
            REST
          </p>
          <div className="mt-3 space-y-1.5 text-sm">
            <p>
              etat: {restLoading ? "chargement" : restError ? "erreur" : "ok"}
            </p>
            <p>spotify: {restSummary.spotify ? "oui" : "non"}</p>
            <p>activites: {restSummary.activities}</p>
            <p>status: {restSummary.status}</p>
            <p>song: {restSummary.song}</p>
            <p>artist: {restSummary.artist}</p>
          </div>
        </div>
      </div>

      {restError && <p className="mt-4 text-sm text-[#f0b6b6]">{restError}</p>}

      <div className="mt-4 space-y-3">
        <details className="rounded-lg border border-[var(--border)] bg-[#0f0f0f] p-4">
          <summary className="cursor-pointer text-sm font-medium">
            JSON websocket
          </summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs text-[var(--text-muted)]">
            {JSON.stringify(websocketData, null, 2)}
          </pre>
        </details>

        <details className="rounded-lg border border-[var(--border)] bg-[#0f0f0f] p-4">
          <summary className="cursor-pointer text-sm font-medium">
            JSON REST
          </summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs text-[var(--text-muted)]">
            {JSON.stringify(restPayload, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
