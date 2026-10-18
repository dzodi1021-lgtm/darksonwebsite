"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./dash.module.css";

const LOGO = "https://i.postimg.cc/0jpcGFjZ/image.png";

interface KeyRow {
  id: number;
  key_value: string;
  status: string | null;
  duration_type: string | null;
  first_used_at: string | null;
  expires_at: string | null;
  hwid: string | null;
  roblox_username: string | null;
  roblox_user_id: string | null;
  disabled_at: string | null;
  created_at: string | null;
  effective_status: "unused" | "active" | "expired" | "disabled";
}

type ToastKind = "info" | "ok" | "err";

interface Modal {
  kind: "delete" | "disable" | "enable" | "reset";
  row: KeyRow;
}

function fmt(v: string | null): string {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return "—";
  }
}

async function api<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number; data: T | null }> {
  const res = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
  const text = await res.text();
  let data: T | null = null;
  try {
    data = text ? (JSON.parse(text) as T) : null;
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

export function DashboardClient() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginMsg, setLoginMsg] = useState<{ text: string; ok: boolean }>({
    text: "",
    ok: true,
  });

  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [query, setQuery] = useState("");
  const [live, setLive] = useState(true);
  const [duration, setDuration] = useState("1d");
  const [createBusy, setCreateBusy] = useState(false);
  const [lastKey, setLastKey] = useState("");

  const [modal, setModal] = useState<Modal | null>(null);
  const [modalBusy, setModalBusy] = useState(false);

  const [toast, setToast] = useState<{ text: string; kind: ToastKind } | null>(
    null,
  );
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((text: string, kind: ToastKind = "info") => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ text, kind });
    toastTimer.current = window.setTimeout(() => setToast(null), 1600);
  }, []);

  const loadKeys = useCallback(
    async (silent: boolean) => {
      const { status, data } = await api<KeyRow[]>("/api/admin/keys");
      if (status === 401) {
        setAuthed(false);
        setLive(false);
        return;
      }
      if (!Array.isArray(data)) {
        setLive(false);
        if (!silent) showToast("Failed to load keys", "err");
        return;
      }
      setLive(true);
      setKeys(data);
    },
    [showToast],
  );

  // boot: check session
  useEffect(() => {
    (async () => {
      const { status } = await api<{ ok: boolean }>("/api/admin/me");
      setAuthed(status === 200);
      setReady(true);
      if (status === 200) {
        loadKeys(true);
      }
    })();
  }, [loadKeys]);

  // live refresh every 3s while authed
  useEffect(() => {
    if (!authed) return;
    const i = window.setInterval(() => loadKeys(true), 3000);
    return () => window.clearInterval(i);
  }, [authed, loadKeys]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return keys;
    return keys.filter((k) =>
      [
        k.key_value,
        k.effective_status,
        k.duration_type,
        k.hwid,
        k.roblox_username,
        k.roblox_user_id,
      ]
        .map((x) => String(x || "").toLowerCase())
        .some((s) => s.includes(q)),
    );
  }, [keys, query]);

  const stats = useMemo(() => {
    const total = keys.length;
    let active = 0;
    let expired = 0;
    let disabled = 0;
    for (const k of keys) {
      if (k.effective_status === "active") active++;
      else if (k.effective_status === "expired") expired++;
      else if (k.effective_status === "disabled") disabled++;
    }
    return { total, active, expired, disabled };
  }, [keys]);

  async function doLogin() {
    setLoginMsg({ text: "", ok: true });
    const u = loginUser.trim();
    const p = loginPass;
    if (!u || !p) {
      setLoginMsg({ text: "Enter username and password.", ok: false });
      return;
    }
    setLoginBusy(true);
    const { status, data } = await api<{ ok: boolean; message?: string }>(
      "/api/admin/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      },
    );
    setLoginBusy(false);
    if (status === 200 && data?.ok) {
      setAuthed(true);
      setLoginUser("");
      setLoginPass("");
      setLoginMsg({ text: "Logged in.", ok: true });
      loadKeys(true);
    } else if (status === 429) {
      setLoginMsg({
        text: data?.message || "Too many attempts, try later.",
        ok: false,
      });
    } else {
      setLoginMsg({ text: data?.message || "Invalid credentials.", ok: false });
    }
  }

  async function doLogout() {
    await api("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setKeys([]);
    showToast("Logged out", "info");
  }

  async function createKey() {
    setCreateBusy(true);
    const { status, data } = await api<{ ok: boolean; key: KeyRow; message?: string }>(
      "/api/admin/keys",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration_type: duration }),
      },
    );
    setCreateBusy(false);
    if (status === 401) {
      setAuthed(false);
      return;
    }
    if (status !== 200 || !data?.ok) {
      showToast(data?.message || "Failed to create key", "err");
      return;
    }
    setLastKey(data.key.key_value);
    showToast("Key generated", "ok");
    loadKeys(true);
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      showToast("Copied", "ok");
    } catch {
      const t = document.createElement("textarea");
      t.value = value;
      document.body.appendChild(t);
      t.select();
      try {
        document.execCommand("copy");
        showToast("Copied", "ok");
      } catch {
        /* ignore */
      }
      document.body.removeChild(t);
    }
  }

  async function confirmModal() {
    if (!modal) return;
    setModalBusy(true);
    try {
      const row = modal.row;
      if (modal.kind === "delete") {
        const { status } = await api(`/api/admin/keys/${row.id}`, {
          method: "DELETE",
        });
        if (status === 200) {
          showToast("Key deleted", "ok");
          setKeys((ks) => ks.filter((k) => k.id !== row.id));
        } else if (status === 401) {
          setAuthed(false);
        } else {
          showToast("Delete failed", "err");
        }
      } else if (modal.kind === "disable" || modal.kind === "enable") {
        const disabled = modal.kind === "disable";
        const { status } = await api(`/api/admin/keys/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ disabled }),
        });
        if (status === 200) {
          showToast(disabled ? "Key disabled" : "Key enabled", "ok");
          loadKeys(true);
        } else if (status === 401) {
          setAuthed(false);
        } else {
          showToast("Action failed", "err");
        }
      } else if (modal.kind === "reset") {
        const { status } = await api(`/api/admin/keys/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reset_hwid: true }),
        });
        if (status === 200) {
          showToast("HWID reset", "ok");
          loadKeys(true);
        } else if (status === 401) {
          setAuthed(false);
        } else {
          showToast("Reset failed", "err");
        }
      }
      setModal(null);
    } finally {
      setModalBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className={styles.loginPage}>
        <div className={styles.pill}>Loading…</div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className={styles.loginPage}>
        <div className={styles.loginFrame}>
          <div className={styles.loginTop}>
            <div className={styles.brand}>
              <img src={LOGO} alt="Darkson" className={styles.brandLogo} />
              <div className={styles.brandTxt}>
                <div className={styles.brandName}>DARKSON</div>
                <div className={styles.brandSub}>Admin • Secure access</div>
              </div>
            </div>
            <div className={styles.pill}>LOGIN</div>
          </div>
          <div className={styles.loginBody}>
            <label htmlFor="u" className={styles.label}>
              Username
            </label>
            <input
              id="u"
              className={styles.input}
              autoComplete="username"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") doLogin();
              }}
            />
            <div style={{ height: 10 }} />
            <label htmlFor="p" className={styles.label}>
              Password
            </label>
            <input
              id="p"
              type="password"
              className={styles.input}
              autoComplete="current-password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") doLogin();
              }}
            />
            <div style={{ height: 14 }} />
            <button
              type="button"
              className={styles.btn}
              onClick={doLogin}
              disabled={loginBusy}
            >
              <span>{loginBusy ? "Signing in…" : "Login"}</span>
              <span style={{ fontSize: 16 }}>→</span>
            </button>
            <div
              className={`${styles.msg} ${
                loginMsg.text ? (loginMsg.ok ? styles.ok : styles.err) : ""
              }`}
            >
              {loginMsg.text}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.dash}>
        <div className={styles.topbar}>
          <div className={styles.brand}>
            <img src={LOGO} alt="Darkson" className={styles.brandLogo} />
            <div className={styles.brandTxt}>
              <div className={styles.brandName}>DARKSON</div>
              <div className={styles.brandSub}>Admin control • Live refresh</div>
            </div>
          </div>
          <div className={styles.topActions}>
            <div className={styles.pill}>
              <span
                className={`${styles.liveDot} ${!live ? styles.off : ""}`}
              />
              <span>{live ? "LIVE" : "OFFLINE"}</span>
            </div>
            <div className={styles.pill}>{keys.length} KEYS</div>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => loadKeys(false)}
            >
              Refresh
            </button>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={doLogout}
            >
              Logout
            </button>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitle}>
                <b>Create</b> key
              </div>
              <div className={`${styles.pill} ${styles.gold}`}>Admin</div>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.row2}>
                <div>
                  <label htmlFor="dur" className={styles.label}>
                    Duration
                  </label>
                  <select
                    id="dur"
                    className={styles.select}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  >
                    <option value="1d">1 day</option>
                    <option value="3d">3 days</option>
                    <option value="7d">7 days</option>
                    <option value="14d">14 days</option>
                    <option value="30d">30 days</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
                <div>
                  <label className={styles.label}>&nbsp;</label>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={createKey}
                    disabled={createBusy}
                  >
                    <span>{createBusy ? "Generating…" : "Generate key"}</span>
                    <span style={{ fontSize: 16 }}>+</span>
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label className={styles.label}>Last generated key</label>
                <input
                  readOnly
                  className={styles.input}
                  value={lastKey}
                  placeholder="—"
                  onFocus={(e) => e.currentTarget.select()}
                />
              </div>
              {lastKey ? (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => copy(lastKey)}
                  >
                    Copy last key
                  </button>
                </div>
              ) : null}

              <div className={styles.stats}>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>Total</div>
                  <div className={styles.statValue}>{stats.total}</div>
                  <div className={styles.statHint}>All keys</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>Active</div>
                  <div className={`${styles.statValue} ${styles.gold}`}>
                    {stats.active}
                  </div>
                  <div className={styles.statHint}>In use</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>Expired</div>
                  <div className={styles.statValue}>{stats.expired}</div>
                  <div className={styles.statHint}>Out of time</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>Disabled</div>
                  <div className={styles.statValue}>{stats.disabled}</div>
                  <div className={styles.statHint}>Blocked</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitle}>
                <b>Database</b> keys
              </div>
              <div className={styles.pill}>Search • Copy • Disable • Delete</div>
            </div>

            <div className={styles.tableTools}>
              <div className={styles.search}>
                <input
                  className={styles.input}
                  placeholder="Search key / hwid / roblox / status…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => {
                  if (lastKey) copy(lastKey);
                  else showToast("No key to copy", "info");
                }}
              >
                Copy last
              </button>
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>First use</th>
                    <th>Expires</th>
                    <th>HWID</th>
                    <th>Roblox</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={styles.cellSmall}>
                        No keys found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((k) => {
                      const st = k.effective_status;
                      const badgeCls =
                        st === "active"
                          ? styles.badgeActive
                          : st === "expired"
                            ? styles.badgeExpired
                            : st === "disabled"
                              ? styles.badgeDisabled
                              : styles.badgeUnused;
                      const expires =
                        k.expires_at
                          ? fmt(k.expires_at)
                          : k.duration_type === "lifetime"
                            ? "Never"
                            : "Not started";
                      return (
                        <tr key={k.id}>
                          <td>
                            <span className={styles.keyPill} title={k.key_value}>
                              <span className={styles.keyText}>
                                {k.key_value}
                              </span>
                              <button
                                type="button"
                                className={styles.tinyBtn}
                                onClick={() => copy(k.key_value)}
                              >
                                Copy
                              </button>
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.badge} ${badgeCls}`}>
                              <span className={styles.bDot} />
                              {st}
                            </span>
                          </td>
                          <td>{k.duration_type || "—"}</td>
                          <td className={styles.cellSmall}>
                            {k.first_used_at ? fmt(k.first_used_at) : "—"}
                          </td>
                          <td className={styles.cellSmall}>{expires}</td>
                          <td className={styles.cellMuted}>
                            {k.hwid
                              ? k.hwid.length > 24
                                ? `${k.hwid.slice(0, 10)}…${k.hwid.slice(-8)}`
                                : k.hwid
                              : "—"}
                          </td>
                          <td className={styles.cellMuted}>
                            {k.roblox_username
                              ? `${k.roblox_username} (${k.roblox_user_id})`
                              : "—"}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div className={styles.actions}>
                              {k.disabled_at ? (
                                <button
                                  type="button"
                                  className={`${styles.tinyBtn} ${styles.gold}`}
                                  onClick={() =>
                                    setModal({ kind: "enable", row: k })
                                  }
                                >
                                  Enable
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.tinyBtn}
                                  onClick={() =>
                                    setModal({ kind: "disable", row: k })
                                  }
                                >
                                  Disable
                                </button>
                              )}
                              {k.first_used_at ? (
                                <button
                                  type="button"
                                  className={styles.tinyBtn}
                                  onClick={() =>
                                    setModal({ kind: "reset", row: k })
                                  }
                                >
                                  Reset HWID
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className={`${styles.tinyBtn} ${styles.danger}`}
                                onClick={() =>
                                  setModal({ kind: "delete", row: k })
                                }
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`${styles.toast} ${toast ? styles.visible : ""} ${
          toast?.kind === "err" ? styles.err : ""
        }`}
      >
        {toast?.text}
      </div>

      <div
        className={`${styles.modalOverlay} ${modal ? styles.visible : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModal(null);
        }}
      >
        {modal ? (
          <div className={styles.modal} role="dialog" aria-modal="true">
            <div className={styles.modalHead}>
              <div className={styles.modalTitle}>
                <b>
                  {modal.kind === "delete"
                    ? "Confirm deletion"
                    : modal.kind === "disable"
                      ? "Disable key"
                      : modal.kind === "enable"
                        ? "Enable key"
                        : "Reset HWID"}
                </b>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setModal(null)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>
                {modal.kind === "delete"
                  ? "This permanently removes the key. The user won't be able to use it anymore. This cannot be undone."
                  : modal.kind === "disable"
                    ? "The key stays in the database but validate-key will reject it until you re-enable it."
                    : modal.kind === "enable"
                      ? "The key becomes usable again. If it's expired, the sweep will mark it expired again."
                      : "This unbinds the HWID and clears the first-use timestamp. On next validate the key rebinds to whoever uses it."}
              </p>
              <div className={styles.dangerBox}>
                <code>{modal.row.key_value}</code>
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnCancel}`}
                  onClick={() => setModal(null)}
                  disabled={modalBusy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${
                    modal.kind === "delete" ? styles.btnDanger : styles.btnGold
                  }`}
                  onClick={confirmModal}
                  disabled={modalBusy}
                >
                  {modal.kind === "delete"
                    ? "Delete key"
                    : modal.kind === "disable"
                      ? "Disable"
                      : modal.kind === "enable"
                        ? "Enable"
                        : "Reset HWID"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
