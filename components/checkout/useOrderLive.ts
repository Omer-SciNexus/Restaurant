"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps a screen fresh. With Pusher configured an update arrives at once; the timer is the
 * fallback, so a dropped connection or missing key only makes updates a little slower.
 */
export function useLiveRefresh(channel: string | null, refresh: () => void, pollMs: number) {
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => latest.current(), pollMs);
    const onFocus = () => latest.current();
    window.addEventListener("focus", onFocus);

    let stop: (() => void) | undefined;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    if (channel && key) {
      let cancelled = false;
      void import("pusher-js").then(({ default: Pusher }) => {
        if (cancelled) return;
        const client = new Pusher(key, { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "us2" });
        client.subscribe(channel).bind("order-updated", () => latest.current());
        stop = () => client.disconnect();
      });
      const inner = () => {
        cancelled = true;
        stop?.();
      };
      return () => {
        clearInterval(timer);
        window.removeEventListener("focus", onFocus);
        inner();
      };
    }
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [channel, pollMs]);
}
