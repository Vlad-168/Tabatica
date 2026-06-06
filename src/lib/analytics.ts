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

// The Umami script is deferred, so calls during app boot can land before
// window.umami exists. Queue them and flush once the API shows up.
const queue: Array<[string, EventData | undefined]> = [];
let polling = false;
function flush(): void {
  while (queue.length > 0 && window.umami) {
    const [event, data] = queue.shift()!;
    try {
      window.umami.track(event, data);
    } catch {
      /* ignore */
    }
  }
}
function startPolling(): void {
  if (polling) return;
  polling = true;
  let attempts = 0;
  const tick = () => {
    if (window.umami) {
      flush();
      polling = false;
      return;
    }
    if (++attempts >= 40) {
      polling = false;
      queue.length = 0;
      return;
    }
    setTimeout(tick, 100);
  };
  setTimeout(tick, 100);
}

export function track(event: string, data?: EventData): void {
  if (dntEnabled()) return;
  if (typeof window === "undefined") return;
  if (window.umami) {
    try {
      window.umami.track(event, data);
    } catch {
      /* analytics failures must never break the app */
    }
    return;
  }
  queue.push([event, data]);
  startPolling();
}

export function pwaMode(): "standalone" | "browser" {
  if (typeof window === "undefined") return "browser";
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return isStandalone ? "standalone" : "browser";
}

export function deviceInfo(): {
  platform: "iOS" | "Android" | "Desktop";
  browser: "Safari" | "Chrome" | "Firefox" | "Edge" | "Other";
} {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  let platform: "iOS" | "Android" | "Desktop" = "Desktop";
  if (/iPhone|iPad|iPod/.test(ua)) platform = "iOS";
  else if (/Android/.test(ua)) platform = "Android";
  let browser: "Safari" | "Chrome" | "Firefox" | "Edge" | "Other" = "Other";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Firefox/.test(ua)) browser = "Firefox";
  else if (/Chrome\//.test(ua) && !/Edg/.test(ua)) browser = "Chrome";
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  return { platform, browser };
}

const INSTALLED_KEY = "tabatica.installedReported";

// Call once on app mount. Sends a session_started event with device/mode and,
// the first time the app is opened in standalone mode (or when the browser
// fires `appinstalled`), reports add_to_home_screen.
export function initSessionTracking(): void {
  if (typeof window === "undefined") return;
  const mode = pwaMode();
  const info = deviceInfo();
  track("session_started", { mode, platform: info.platform, browser: info.browser });

  if (mode === "standalone") {
    try {
      if (!localStorage.getItem(INSTALLED_KEY)) {
        track("add_to_home_screen", { method: "detected", platform: info.platform });
        localStorage.setItem(INSTALLED_KEY, "1");
      }
    } catch {
      /* private browsing — non-fatal */
    }
  }

  window.addEventListener("appinstalled", () => {
    track("add_to_home_screen", { method: "prompt", platform: info.platform });
    try {
      localStorage.setItem(INSTALLED_KEY, "1");
    } catch {
      /* ignore */
    }
  });
}
