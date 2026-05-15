import { useEffect, useMemo } from "react";
import { useTimer } from "../hooks/useTimer";
import { useWakeLock } from "../hooks/useWakeLock";
import type { Segment, Settings } from "../types";
import { formatClock, formatDuration } from "../lib/format";
import * as Icon from "./icons";

interface Props {
  segments: Segment[];
  settings: Settings;
  name: string;
  onClose: () => void;
  onComplete: (activeSeconds: number) => void;
}

const PHASE_BG: Record<string, [string, string]> = {
  prepare: ["#f59e0b", "#d97706"],
  work: ["#6366f1", "#4338ca"],
  rest: ["#14b8a6", "#0d9488"],
  restset: ["#0ea5e9", "#0369a1"],
  cooldown: ["#8b5cf6", "#6d28d9"],
  done: ["#22c55e", "#15803d"],
};

export function RunScreen({ segments, settings, name, onClose, onComplete }: Props) {
  const totalPlanned = useMemo(
    () => segments.reduce((s, x) => s + x.duration, 0),
    [segments],
  );

  const t = useTimer({ segments, settings, onComplete });
  const wake = useWakeLock();

  useEffect(() => {
    t.start();
    if (settings.keepAwake) void wake.acquire();
    return () => {
      void wake.release();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seg: Segment | undefined = t.segment;
  const phase = t.finished ? "done" : seg?.phase ?? "work";
  const [c1, c2] = PHASE_BG[phase] ?? PHASE_BG.work;

  const elapsedBefore = useMemo(() => {
    let s = 0;
    for (let i = 0; i < t.idx; i++) s += segments[i]?.duration ?? 0;
    return s;
  }, [t.idx, segments]);

  const segElapsed = seg ? seg.duration - t.remaining : 0;
  const overallPct = totalPlanned
    ? Math.min(100, ((elapsedBefore + segElapsed) / totalPlanned) * 100)
    : 0;

  const R = 130;
  const C = 2 * Math.PI * R;
  const frac = seg && seg.duration > 0 ? Math.max(0, t.remaining / seg.duration) : 0;

  const next = segments[t.idx + 1];
  const showSecs = Math.max(0, Math.ceil(t.remaining));

  const meta =
    seg && (seg.phase === "work" || seg.phase === "rest")
      ? `Cycle ${seg.cycle}/${seg.totalCycles}${seg.totalSets > 1 ? ` · Set ${seg.set}/${seg.totalSets}` : ""}`
      : seg?.phase === "restset"
        ? `Set ${seg.set}/${seg.totalSets} done`
        : "";

  const finishStats = useMemo(() => {
    const work = segments
      .filter((s) => s.phase === "work")
      .reduce((a, b) => a + b.duration, 0);
    const rounds = segments.filter((s) => s.phase === "work").length;
    return { work, rounds };
  }, [segments]);

  return (
    <div
      className="run"
      style={{ background: `linear-gradient(160deg, ${c1}, ${c2})` }}
    >
      <div className="run-top">
        <button className="run-close" onClick={onClose} aria-label="close">
          <Icon.Close />
        </button>
        <div className="run-meta">{name}</div>
        <div style={{ width: 42 }} />
      </div>

      {t.finished ? (
        <div className="done-screen">
          <Icon.Check style={{ width: 64, height: 64 }} className="pop" />
          <div className="big">Workout Complete</div>
          <div style={{ opacity: 0.9 }}>Nice work — saved to your history.</div>
          <div className="done-stats">
            <div>
              <div className="n">{formatClock(totalPlanned)}</div>
              <div className="l">Total</div>
            </div>
            <div>
              <div className="n">{finishStats.rounds}</div>
              <div className="l">Rounds</div>
            </div>
            <div>
              <div className="n">{formatDuration(finishStats.work)}</div>
              <div className="l">Work</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            <button className="ctrl" onClick={() => t.toggle()} aria-label="restart">
              <Icon.Cycle />
            </button>
            <button
              className="ctrl main"
              onClick={onClose}
              style={{ width: 64, height: 64 }}
              aria-label="done"
            >
              <Icon.Check />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="run-phase">
            <div className="phase-name">{seg?.label ?? "Ready"}</div>
            <div className="phase-sub">{seg?.description || meta}</div>
          </div>

          <div className="dial-wrap">
            <div className="dial">
              <svg viewBox="0 0 300 300">
                <circle className="track" cx="150" cy="150" r={R} fill="none" strokeWidth="16" />
                <circle
                  className="prog"
                  cx="150"
                  cy="150"
                  r={R}
                  fill="none"
                  strokeWidth="16"
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - frac)}
                />
              </svg>
              <div className="dial-center">
                <div className="dial-time">{formatClock(showSecs)}</div>
                <div className="dial-next">
                  {next ? `Next · ${next.label}` : "Final round"}
                </div>
              </div>
            </div>
          </div>

          <div className="run-progressbar">
            <i style={{ width: `${overallPct}%` }} />
          </div>

          <div className="run-controls">
            <button className="ctrl" onClick={t.prev} aria-label="previous">
              <Icon.Prev />
            </button>
            <button className="ctrl main" onClick={t.toggle} aria-label="play pause">
              {t.running ? <Icon.Pause /> : <Icon.Play />}
            </button>
            <button className="ctrl" onClick={t.next} aria-label="skip">
              <Icon.Next />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
