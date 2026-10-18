"use client";

import { useEffect, useState } from "react";
import styles from "./key-ui.module.css";

const LOGO = "https://i.postimg.cc/0jpcGFjZ/image.png";

/**
 * Full-screen logo overlay that fades in, holds, then fades/scales out to
 * reveal the key page beneath. Only plays once per session.
 */
export function KeyIntro() {
  const [phase, setPhase] = useState<"idle" | "show" | "leaving" | "done">(
    "idle",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem("darkson_key_intro") === "1") {
        setPhase("done");
        return;
      }
    } catch {
      /* ignore */
    }

    const r1 = requestAnimationFrame(() => setPhase("show"));
    const t1 = setTimeout(() => setPhase("leaving"), 1600);
    const t2 = setTimeout(() => {
      setPhase("done");
      try {
        sessionStorage.setItem("darkson_key_intro", "1");
      } catch {
        /* ignore */
      }
    }, 2400);
    return () => {
      cancelAnimationFrame(r1);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "done" || phase === "idle") {
    return phase === "idle" ? (
      <div className={styles.intro} aria-hidden="true" />
    ) : null;
  }

  const cls = `${styles.intro} ${
    phase === "show" ? styles.show : phase === "leaving" ? styles.leaving : ""
  }`;

  return (
    <div className={cls} aria-hidden="true">
      <img
        src={LOGO}
        alt=""
        className={styles.introLogo}
        draggable={false}
      />
    </div>
  );
}
