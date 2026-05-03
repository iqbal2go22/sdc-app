"use client";

// Pings /api/heartbeat every 60s while the tab is visible. Uses Page Visibility API so we only
// count truly-active time-on-app per D20.

import { useEffect, useRef } from "react";

export function Heartbeat() {
  const last = useRef<number>(Date.now());
  const inFlight = useRef(false);

  useEffect(() => {
    function tick() {
      if (document.visibilityState !== "visible") {
        last.current = Date.now();
        return;
      }
      if (inFlight.current) return;
      const now = Date.now();
      const deltaMs = now - last.current;
      last.current = now;
      if (deltaMs <= 0 || deltaMs > 5 * 60 * 1000) return; // skip resume-from-sleep gaps
      inFlight.current = true;
      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deltaMs }),
        keepalive: true,
      })
        .catch(() => {})
        .finally(() => {
          inFlight.current = false;
        });
    }

    const interval = setInterval(tick, 60_000);
    function onVisibility() {
      last.current = Date.now();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
