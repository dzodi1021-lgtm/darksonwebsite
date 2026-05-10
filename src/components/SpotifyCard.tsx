"use client";

import { useEffect, useState } from "react";
import type { LanyardSpotify } from "@/hooks/useLanyard";
import { findCurrentLyricIndex, type LyricsPayload } from "@/libs/lyrics";
import styles from "./SpotifyCard.module.css";

interface SpotifyCardProps {
  spotify: LanyardSpotify;
}

type LyricsState = "loading" | "ready" | "empty" | "error";

const emptyLyrics: LyricsPayload = {
  found: false,
  instrumental: false,
  synced: [],
  plain: [],
  provider: "lrclib",
};

const lyricsCache = new Map<string, LyricsPayload>();

function time(ms: number) {
  const totalSeconds = Math.floor(Math.max(ms, 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function Logo() {
  return (
    <svg viewBox="0 0 24 24" className={styles.logo} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1ed760" />
      <path
        d="M6.35 9.25c3.7-1.12 8.53-.71 11.48 1.02M7.05 12.26c3.1-.91 7.03-.58 9.43.85M7.55 15.05c2.36-.68 5.25-.43 7.15.68"
        fill="none"
        stroke="#0a0a0a"
        strokeLinecap="round"
        strokeWidth="1.55"
      />
    </svg>
  );
}

function keyFor(spotify: LanyardSpotify, duration: number) {
  return [
    spotify.track_id,
    spotify.song,
    spotify.artist,
    Math.round(duration / 1000),
  ]
    .join("|")
    .toLowerCase();
}

function state(payload: LyricsPayload): LyricsState {
  const hasLyrics = payload.synced.length > 0 || payload.plain.length > 0;

  return payload.instrumental || !hasLyrics ? "empty" : "ready";
}

function readCache(key: string) {
  if (lyricsCache.has(key)) {
    return lyricsCache.get(key) || null;
  }

  try {
    const raw = window.localStorage.getItem(`lyrics:${key}`);

    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as LyricsPayload;
    lyricsCache.set(key, cached);

    return cached;
  } catch {
    return null;
  }
}

function saveCache(key: string, payload: LyricsPayload) {
  lyricsCache.set(key, payload);

  try {
    window.localStorage.setItem(`lyrics:${key}`, JSON.stringify(payload));
  } catch {
    // Storage is only a speed boost. The card still works without it.
  }
}

export function SpotifyCard({ spotify }: SpotifyCardProps) {
  const [elapsed, setElapsed] = useState(0);
  const [lyrics, setLyrics] = useState<LyricsPayload>(emptyLyrics);
  const [lyricsState, setLyricsState] = useState<LyricsState>("loading");

  const duration = Math.max(
    spotify.timestamps.end - spotify.timestamps.start,
    1,
  );
  const progress = (elapsed / duration) * 100;
  const key = keyFor(spotify, duration);

  useEffect(() => {
    function tick() {
      const nextElapsed = Math.min(
        Math.max(Date.now() - spotify.timestamps.start, 0),
        duration,
      );

      setElapsed(nextElapsed);
    }

    tick();
    const timer = window.setInterval(tick, 500);

    return () => window.clearInterval(timer);
  }, [duration, spotify.timestamps.start]);

  useEffect(() => {
    const controller = new AbortController();
    const cached = readCache(key);

    if (cached) {
      setLyrics(cached);
      setLyricsState(state(cached));
    } else {
      setLyrics(emptyLyrics);
      setLyricsState("loading");
    }

    async function loadLyrics() {
      const params = new URLSearchParams({
        song: spotify.song,
        artist: spotify.artist,
        album: spotify.album,
        durationMs: String(duration),
      });

      try {
        const response = await fetch(`/api/lyrics?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Lyrics request failed");
        }

        const nextLyrics = (await response.json()) as LyricsPayload;

        saveCache(key, nextLyrics);
        setLyrics(nextLyrics);
        setLyricsState(state(nextLyrics));
      } catch {
        if (!controller.signal.aborted) {
          if (!cached) {
            setLyrics(emptyLyrics);
          }
          setLyricsState("error");
        }
      }
    }

    void loadLyrics();

    return () => controller.abort();
  }, [
    duration,
    key,
    spotify.album,
    spotify.artist,
    spotify.song,
    spotify.track_id,
  ]);

  const activeLineIndex = findCurrentLyricIndex(lyrics.synced, elapsed);
  const previousLine =
    activeLineIndex > 0 ? lyrics.synced[activeLineIndex - 1] : null;
  const currentLine =
    activeLineIndex >= 0 ? lyrics.synced[activeLineIndex] : lyrics.synced[0];
  const upcomingLines =
    activeLineIndex >= 0
      ? lyrics.synced.slice(activeLineIndex + 1, activeLineIndex + 3)
      : lyrics.synced.slice(1, 3);

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <img
          src={spotify.album_art_url}
          alt={spotify.album}
          className={styles.art}
        />

        <div className={styles.body}>
          <div className={styles.brand}>
            <Logo />
            <span className={styles.brandText}>
              Spotify
            </span>
          </div>
          <p className={styles.song}>{spotify.song}</p>
          <p className={styles.artist}>
            {spotify.artist}
          </p>
        </div>
      </div>

      <div className={styles.progressBlock}>
        <div className={styles.progress}>
          <div className={styles.fill} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.timeRow}>
          <span>{time(elapsed)}</span>
          <span>{time(duration)}</span>
        </div>
      </div>

      <div className={styles.lyrics}>
        <div className={styles.lyricsHead}>
          <span className={styles.lyricsLabel}>
            {lyrics.synced.length > 0 ? "Live lyrics" : "Lyrics"}
          </span>
        </div>

        {lyricsState === "ready" && lyrics.synced.length > 0 && (
          <div className={styles.live}>
            {previousLine && (
              <p className={styles.mutedLine}>
                {previousLine.text}
              </p>
            )}
            {currentLine && (
              <p className={styles.currentLine}>
                {currentLine.text}
              </p>
            )}
            {upcomingLines.map((line) => (
              <p
                key={`${line.startTimeMs}-${line.text}`}
                className={styles.mutedLine}
              >
                {line.text}
              </p>
            ))}
          </div>
        )}

        {lyricsState === "ready" && lyrics.synced.length === 0 && (
          <div className={styles.plain}>
            {lyrics.plain.slice(0, 4).map((line, index) => (
              <p
                key={`${line}-${index}`}
                className={styles.plainLine}
              >
                {line}
              </p>
            ))}
          </div>
        )}

        {lyricsState === "empty" && (
          <p className={styles.message}>
            {lyrics.instrumental
              ? "This track is instrumental."
              : "Lyrics are not available for this track."}
          </p>
        )}

        {lyricsState === "error" && (
          <p className={styles.message}>
            Could not load live lyrics right now.
          </p>
        )}

        {lyricsState === "loading" && (
          <div className={styles.loading}>
            <span className={styles.loader} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>Syncing lyrics</span>
          </div>
        )}
      </div>
    </div>
  );
}
