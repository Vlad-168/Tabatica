import { useMemo } from "react";
import type { HistoryEntry } from "../types";
import { formatDay, formatDuration, formatTime } from "../lib/format";
import { exportCsv, exportJson } from "../lib/export";
import * as Icon from "./icons";

interface Props {
  history: HistoryEntry[];
  onDelete: (id: string) => void;
  onClear: () => void;
}

const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

function currentStreak(history: HistoryEntry[]): number {
  const days = new Set(history.map((h) => dayKey(h.date)));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function HistoryScreen({ history, onDelete, onClear }: Props) {
  const stats = useMemo(() => {
    const totalActive = history.reduce((s, h) => s + h.activeSeconds, 0);
    return {
      sessions: history.length,
      minutes: Math.round(totalActive / 60),
      streak: currentStreak(history),
    };
  }, [history]);

  const groups = useMemo(() => {
    const map = new Map<number, HistoryEntry[]>();
    for (const h of history) {
      const key = new Date(h.date).setHours(0, 0, 0, 0);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(h);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="empty">
        <Icon.HistoryTab />
        <div style={{ fontWeight: 700, color: "var(--text)" }}>No workouts yet</div>
        <div style={{ marginTop: 6 }}>Finish a session and it’ll show up here with your stats and streak.</div>
      </div>
    );
  }

  return (
    <>
      <div className="stat-grid">
        <div className="stat">
          <div className="n">{stats.sessions}</div>
          <div className="l">Workouts</div>
        </div>
        <div className="stat">
          <div className="n">{stats.minutes}</div>
          <div className="l">Active min</div>
        </div>
        <div className="stat">
          <div className="n" style={{ display: "flex", gap: 4, justifyContent: "center", alignItems: "center" }}>
            <Icon.Flame style={{ width: 18, height: 18 }} />
            {stats.streak}
          </div>
          <div className="l">Day streak</div>
        </div>
      </div>

      {groups.map(([day, items]) => (
        <div key={day}>
          <div className="hist-day">{formatDay(day)}</div>
          <div className="card">
            {items.map((h) => (
              <div className="hist-item" key={h.id}>
                <div
                  className="hist-dot"
                  style={
                    h.completed
                      ? undefined
                      : { background: "linear-gradient(135deg,#9aa0bd,#6b6f86)" }
                  }
                >
                  {h.completed ? <Icon.Check /> : <Icon.Pause />}
                </div>
                <div className="hist-main">
                  <div className="hist-name">{h.name}</div>
                  <div className="hist-sub">
                    {formatTime(h.date)} · {formatDuration(h.activeSeconds)} active ·{" "}
                    {h.cycles}×{h.sets} {h.completed ? "" : "· stopped early"}
                  </div>
                </div>
                <button className="hist-del" onClick={() => onDelete(h.id)} aria-label="delete">
                  <Icon.Trash />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="section-label">Export</div>
      <button className="btn-ghost" onClick={() => exportCsv(history)}>
        <Icon.Download />
        Export CSV (for Apple Health)
      </button>
      <button className="btn-ghost" onClick={() => exportJson(history)}>
        <Icon.Download />
        Export JSON backup
      </button>
      <button
        className="btn-ghost"
        style={{ color: "#ef4444" }}
        onClick={() => {
          if (confirm("Delete all workout history? This cannot be undone.")) onClear();
        }}
      >
        <Icon.Trash />
        Clear history
      </button>
    </>
  );
}
