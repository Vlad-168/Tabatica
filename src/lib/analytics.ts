// Thin wrapper around Umami so the rest of the app stays decoupled from the
// vendor. No-ops if the script isn't loaded yet or if the user has Do Not
// Track enabled — no personal data is ever collected.
type EventData = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: EventData) => void;
    };
  }
}

function dntEnabled(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { msDoNotTrack?: string };
  const dnt =
    nav.doNotTrack ||
    nav.msDoNotTrack ||
    (typeof window !== "undefined"
      ? (window as Window & { doNotTrack?: string }).doNotTrack
      : undefined);
  return dnt === "1" || dnt === "yes";
}

export function track(event: string, data?: EventData): void {
  if (dntEnabled()) return;
  if (typeof window === "undefined" || !window.umami) return;
  try {
    window.umami.track(event, data);
  } catch {
    /* analytics failures must never break the app */
  }
}
