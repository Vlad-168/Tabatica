import { useCallback, useEffect, useRef } from "react";

type WakeLockSentinelLike = { release: () => Promise<void>; released: boolean };

// Keeps the screen awake during a workout (iOS 16.4+ / modern browsers).
// Re-acquires automatically when the tab becomes visible again.
export function useWakeLock() {
  const sentinel = useRef<WakeLockSentinelLike | null>(null);
  const active = useRef(false);

  const acquire = useCallback(async () => {
    active.current = true;
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } })
      .wakeLock;
    if (!wl) return;
    try {
      sentinel.current = await wl.request("screen");
    } catch {
      /* denied or not allowed in this context — non-fatal */
    }
  }, []);

  const release = useCallback(async () => {
    active.current = false;
    try {
      await sentinel.current?.release();
    } catch {
      /* already released */
    }
    sentinel.current = null;
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && active.current && !sentinel.current) {
        void acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [acquire]);

  return { acquire, release };
}
