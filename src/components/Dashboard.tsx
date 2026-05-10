"use client";

import { useEffect, useMemo, useState } from "react";
import type { Stats } from "@/libs/counters";
import type { NameStyle, SiteConfig } from "@/libs/site-config";
import styles from "./Dashboard.module.css";

interface DashboardProps {
  initialConfig: SiteConfig;
  initialStats: Stats;
  ipAddress: string;
}

const styleOptions: Array<{ value: NameStyle; label: string }> = [
  { value: "clean", label: "Clean" },
  { value: "glow", label: "Glow" },
  { value: "frost", label: "Frost" },
  { value: "chrome", label: "Chrome" },
  { value: "ghost", label: "Ghost" },
  { value: "pulse", label: "Pulse" },
  { value: "outline", label: "Outline" },
];

function short(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function line(points: Stats["points"], width = 760, height = 260) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;

  return points
    .map((point, index) => {
      const x = index * step;
      const y = height - (point.value / max) * (height - 26) - 12;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function area(points: Stats["points"], width = 760, height = 260) {
  return `0,${height} ${line(points, width, height)} ${width},${height}`;
}

export function Dashboard({
  initialConfig,
  initialStats,
  ipAddress,
}: DashboardProps) {
  const [config, setConfig] = useState(initialConfig);
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const [range, setRange] = useState<Stats["range"]>("day");
  const [data, setData] = useState(initialStats);

  useEffect(() => {
    let alive = true;

    fetch(`/api/analytics?range=${range}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((nextData: Stats) => {
        if (alive) {
          setData(nextData);
        }
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [range]);

  const chartLine = useMemo(() => line(data.points), [data.points]);
  const chartArea = useMemo(() => area(data.points), [data.points]);
  const lastPoint = data.points[data.points.length - 1]?.value || 0;

  function set(key: keyof SiteConfig, value: string) {
    setConfig((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function save() {
    setSaving(true);
    setSaved("");

    try {
      const response = await fetch("/api/site-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Save failed");
      }

      setConfig((await response.json()) as SiteConfig);
      setSaved("Saved");
    } catch (error) {
      setSaved(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.side}>
        <div className={styles.brand}>
          <div className={styles.logo}>D</div>
          <div>
            <p className={styles.welcome}>Welcome back</p>
            <p className={styles.handle}>DarkSon</p>
          </div>
        </div>

        <nav className={styles.nav}>
          <span className={styles.active}>Account</span>
          <span>Customize</span>
          <span>Analytics</span>
          <span>Settings</span>
        </nav>

        <div className={styles.pageCard}>
          <p>Check out your page</p>
          <a href={config.pageUrl || "/"} target="_blank" rel="noreferrer">
            My Page
          </a>
        </div>
      </aside>

      <section className={styles.panel}>
        <div className={styles.top}>
          <div>
            <p className={styles.kicker}>Owner dashboard</p>
            <h1>Account overview</h1>
            <p className={styles.ip}>Allowed IP: {ipAddress}</p>
          </div>
          <button className={styles.save} type="button" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>

        {saved && <p className={styles.notice}>{saved}</p>}

        <div className={styles.cards}>
          <div className={styles.stat}>
            <span>Display name</span>
            <strong>{config.displayName || "DarkSon"}</strong>
          </div>
          <div className={styles.stat}>
            <span>Profile views</span>
            <strong>{short(data.total)}</strong>
          </div>
          <div className={styles.stat}>
            <span>Today</span>
            <strong>{short(data.today)}</strong>
          </div>
          <div className={styles.stat}>
            <span>This week</span>
            <strong>{short(data.week)}</strong>
          </div>
        </div>

        <div className={styles.grid}>
          <section className={styles.chartCard}>
            <div className={styles.chartHead}>
              <div>
                <p className={styles.kicker}>Profile views</p>
                <h2>{short(lastPoint)} in latest point</h2>
              </div>
              <div className={styles.tabs}>
                {(["day", "week", "month"] as const).map((item) => (
                  <button
                    key={item}
                    className={range === item ? styles.tabActive : ""}
                    type="button"
                    onClick={() => setRange(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <svg className={styles.chart} viewBox="0 0 760 260" role="img">
              <defs>
                <linearGradient id="viewsFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
                </linearGradient>
              </defs>
              <polyline className={styles.gridLine} points="0,64 760,64" />
              <polyline className={styles.gridLine} points="0,132 760,132" />
              <polyline className={styles.gridLine} points="0,200 760,200" />
              <polygon points={chartArea} fill="url(#viewsFill)" />
              <polyline className={styles.stroke} points={chartLine} />
            </svg>
            <div className={styles.labels}>
              <span>{data.points[0]?.label}</span>
              <span>{data.points[Math.floor(data.points.length / 2)]?.label}</span>
              <span>{data.points[data.points.length - 1]?.label}</span>
            </div>
          </section>

          <section className={styles.editor}>
            <h2>Customize page</h2>
            <label>
              Display name
              <input
                value={config.displayName}
                onChange={(event) => set("displayName", event.target.value)}
              />
            </label>
            <label>
              Username
              <input
                value={config.username}
                onChange={(event) => set("username", event.target.value)}
              />
            </label>
            <label>
              Name style
              <select
                value={config.nameStyle}
                onChange={(event) => set("nameStyle", event.target.value)}
              >
                {styleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Avatar URL
              <input
                value={config.avatarUrl}
                placeholder="Leave empty to use Lanyard"
                onChange={(event) => set("avatarUrl", event.target.value)}
              />
            </label>
            <label>
              Background URL
              <input
                value={config.backgroundUrl}
                placeholder="Image / gif URL"
                onChange={(event) => set("backgroundUrl", event.target.value)}
              />
            </label>
            <label>
              Music URL
              <input
                value={config.musicUrl}
                placeholder="Direct .mp3 / .ogg URL"
                onChange={(event) => set("musicUrl", event.target.value)}
              />
            </label>
            <label>
              Music title
              <input
                value={config.musicTitle}
                onChange={(event) => set("musicTitle", event.target.value)}
              />
            </label>
            <label>
              Page URL
              <input
                value={config.pageUrl}
                onChange={(event) => set("pageUrl", event.target.value)}
              />
            </label>
          </section>
        </div>
      </section>
    </main>
  );
}
