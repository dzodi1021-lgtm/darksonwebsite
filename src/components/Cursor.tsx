"use client";

import { useEffect } from "react";

export function Cursor() {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    function set(name: string, value: number) {
      root.style.setProperty(name, `${value.toFixed(2)}px`);
    }

    function move(event: PointerEvent) {
      set("--mouse-x", event.clientX);
      set("--mouse-y", event.clientY);
      set("--lamp-x", event.clientX);
      set("--lamp-y", event.clientY);
      body.classList.add("cursor-ready");
    }

    function hide() {
      body.classList.remove("cursor-ready");
    }

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerleave", hide);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerleave", hide);
      body.classList.remove("cursor-ready");
    };
  }, []);

  return (
    <>
      <div className="cursor-glow" aria-hidden="true" />
      <div className="cursor-dot" aria-hidden="true" />
    </>
  );
}
