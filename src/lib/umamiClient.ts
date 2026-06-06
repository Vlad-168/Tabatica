// Tiny client for the Umami Cloud REST API. The API key is supplied by the
// admin at runtime (stored in localStorage only — never baked into the
// shipped JS bundle).
const WEBSITE_ID = "76e4a2ec-48bd-4017-afad-e5170f0c9640";
const API_BASE = "https://api.umami.is/v1";

export interface StatsResponse {
  pageviews: { value: number; prev: number };
  visitors: { value: number; prev: number };
  visits: { value: number; prev: number };
  bounces: { value: number; prev: number };
  totaltime: { value: number; prev: number };
}

export interface MetricRow {
  x: string;
  y: number;
}

interface BaseOpts {
  apiKey: string;
  startAt: number;
  endAt: number;
}

async function call<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${API_BASE}/websites/${WEBSITE_ID}${path}`, {
    headers: { "x-umami-api-key": apiKey, accept: "application/json" },
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 140);
    } catch {
      /* ignore */
    }
    throw new Error(`HTTP ${res.status}${detail ? ` — ${detail}` : ""}`);
  }
  return (await res.json()) as T;
}

export function fetchStats(opts: BaseOpts): Promise<StatsResponse> {
  return call<StatsResponse>(`/stats?startAt=${opts.startAt}&endAt=${opts.endAt}`, opts.apiKey);
}

export function fetchMetrics(
  opts: BaseOpts & { type: "url" | "country" | "browser" | "event" | "os" | "device"; limit?: number },
): Promise<MetricRow[]> {
  const lim = opts.limit ? `&limit=${opts.limit}` : "";
  return call<MetricRow[]>(
    `/metrics?startAt=${opts.startAt}&endAt=${opts.endAt}&type=${opts.type}${lim}`,
    opts.apiKey,
  );
}

// Aggregates the values of a single event property (e.g. preset name).
export function fetchEventValues(
  opts: BaseOpts & { eventName: string; propertyName: string },
): Promise<MetricRow[]> {
  const q = new URLSearchParams({
    startAt: String(opts.startAt),
    endAt: String(opts.endAt),
    eventName: opts.eventName,
    propertyName: opts.propertyName,
  });
  return call<MetricRow[]>(`/event-data/values?${q.toString()}`, opts.apiKey);
}
