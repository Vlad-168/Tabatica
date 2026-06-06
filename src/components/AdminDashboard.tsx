import { useCallback, useEffect, useState } from "react";
import {
  fetchEventValues,
  fetchMetrics,
  fetchStats,
  type MetricRow,
  type StatsResponse,
} from "../lib/umamiClient";

interface Props {
  apiKey: string;
  onClearKey: () => void;
}

interface Data {
  stats: StatsResponse;
  countries: MetricRow[];
  events: MetricRow[];
  presetStarted: MetricRow[];
  presetApplied: MetricRow[];
}

const WEEK_MS = 7 * 86400000;

function countByName(rows: MetricRow[], name: string): number {
  return rows.find((r) => r.x === name)?.y ?? 0;
}

function mergePresetCounts(a: MetricRow[], b: MetricRow[]): MetricRow[] {
  const map = new Map<string, number>();
  for (const r of [...a, ...b]) {
    map.set(r.x, (map.get(r.x) ?? 0) + r.y);
  }
  return [...map.entries()]
    .map(([x, y]) => ({ x, y }))
    .sort((m, n) => n.y - m.y)
    .slice(0, 5);
}

export function AdminDashboard({ apiKey, onClearKey }: Props) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endAt = Date.now();
      const startAt = endAt - WEEK_MS;
      const base = { apiKey, startAt, endAt };
      const [stats, countries, events, presetStarted, presetApplied] = await Promise.all([
        fetchStats(base),
        fetchMetrics({ ...base, type: "country", limit: 5 }),
        fetchMetrics({ ...base, type: "event", limit: 20 }),
        fetchEventValues({ ...base, eventName: "workout_started", propertyName: "preset" }),
        fetchEventValues({ ...base, eventName: "preset_applied", propertyName: "name" }),
      ]);
      setData({ stats, countries, events, presetStarted, presetApplied });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const started = data ? countByName(data.events, "workout_started") : 0;
  const completed = data ? countByName(data.events, "workout_completed") : 0;
  const installs = data ? countByName(data.events, "add_to_home_screen") : 0;
  const topPresets = data ? mergePresetCounts(data.presetStarted, data.presetApplied) : [];

  return (
    <div className="card">
      <div className="set-row" style={{ alignItems: "center" }}>
        <div className="set-main">
          <div className="set-title">Last 7 days</div>
          <div className="set-sub">Live from Umami</div>
        </div>
        <button
          className="icon-btn"
          onClick={() => void load()}
          disabled={loading}
          aria-label="refresh"
          style={{ marginRight: 6 }}
        >
          {loading ? "…" : "↻"}
        </button>
        <button
          className="icon-btn"
          onClick={onClearKey}
          aria-label="disconnect"
          title="Disconnect API key"
        >
          ✕
        </button>
      </div>

      {error && <div className="note" style={{ color: "#ef4444" }}>Couldn’t load: {error}</div>}

      {data && (
        <>
          <div className="stat-grid" style={{ padding: "8px 16px 16px" }}>
            <div className="stat">
              <div className="n">{data.stats.visitors.value}</div>
              <div className="l">Visitors</div>
            </div>
            <div className="stat">
              <div className="n">{data.stats.visits.value}</div>
              <div className="l">Sessions</div>
            </div>
            <div className="stat">
              <div className="n">{installs}</div>
              <div className="l">Installs</div>
            </div>
          </div>
          <div className="stat-grid" style={{ padding: "0 16px 16px" }}>
            <div className="stat">
              <div className="n">{started}</div>
              <div className="l">Started</div>
            </div>
            <div className="stat">
              <div className="n">{completed}</div>
              <div className="l">Completed</div>
            </div>
            <div className="stat">
              <div className="n">
                {started > 0 ? Math.round((completed / started) * 100) : 0}
                <span style={{ fontSize: 14, fontWeight: 700 }}>%</span>
              </div>
              <div className="l">Finish rate</div>
            </div>
          </div>

          <div style={{ padding: "0 16px 16px" }}>
            <div className="hist-day" style={{ margin: "4px 0 6px" }}>Top countries</div>
            {data.countries.length === 0 ? (
              <div className="set-sub">No data yet</div>
            ) : (
              data.countries.map((c) => (
                <div key={c.x} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span>{c.x || "—"}</span>
                  <span style={{ fontWeight: 700 }}>{c.y}</span>
                </div>
              ))
            )}

            <div className="hist-day" style={{ margin: "14px 0 6px" }}>Top presets</div>
            {topPresets.length === 0 ? (
              <div className="set-sub">No data yet</div>
            ) : (
              topPresets.map((p) => (
                <div key={p.x} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span>{p.x}</span>
                  <span style={{ fontWeight: 700 }}>{p.y}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
