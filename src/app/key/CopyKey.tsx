"use client";

import { useState } from "react";
import styles from "./key-ui.module.css";

export function CopyKey({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      const t = document.createElement("textarea");
      t.value = value;
      document.body.appendChild(t);
      t.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      } catch {
        /* noop */
      }
      document.body.removeChild(t);
    }
  }

  return (
    <button type="button" className={styles.copyBtn} onClick={copy}>
      <span>{copied ? "Copied" : "Copy key"}</span>
      <span>{copied ? "✓" : "⧉"}</span>
    </button>
  );
}
