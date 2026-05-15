import { useState } from "react";
import type { Preset, WorkoutConfig } from "../types";
import { DEFAULT_CONFIG } from "../lib/timeline";
import { formatClock } from "../lib/format";
import { buildTimeline, totalDuration } from "../lib/timeline";
import * as Icon from "./icons";

interface Props {
  presets: Preset[];
  current: WorkoutConfig;
  onApply: (c: WorkoutConfig) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const TEMPLATES: { name: string; config: WorkoutConfig }[] = [
  {
    name: "Classic Tabata",
    config: { ...DEFAULT_CONFIG, prepare: 10, work: 20, rest: 10, cycles: 8, sets: 1, restBetweenSets: 0 },
  },
  {
    name: "HIIT 40/20",
    config: { ...DEFAULT_CONFIG, prepare: 15, work: 40, rest: 20, cycles: 8, sets: 1, restBetweenSets: 0 },
  },
  {
    name: "Strength 3 sets",
    config: { ...DEFAULT_CONFIG, prepare: 15, work: 45, rest: 15, cycles: 5, sets: 3, restBetweenSets: 90 },
  },
  {
    name: "Quick Sweat",
    config: { ...DEFAULT_CONFIG, prepare: 10, work: 30, rest: 10, cycles: 6, sets: 2, restBetweenSets: 45 },
  },
];

function summarize(c: WorkoutConfig): string {
  const total = totalDuration(buildTimeline(c));
  return `${c.work}s / ${c.rest}s · ${c.cycles}×${c.sets} · ${formatClock(total)}`;
}

export function PresetsSheet({ presets, current, onApply, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState("");

  const save = () => {
    const n = name.trim();
    if (!n) return;
    onSave(n);
    setName("");
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <h3>Save current workout</h3>
        <div className="field">
          <input
            value={name}
            placeholder="Workout name…"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
          />
          <button onClick={save}>Save</button>
        </div>
        <div className="hist-sub" style={{ margin: "0 4px 18px" }}>
          Current: {summarize(current)}
        </div>

        {presets.length > 0 && (
          <>
            <h3>Your workouts</h3>
            {presets.map((p) => (
              <div className="preset-item" key={p.id}>
                <div className="pi-main">
                  <div className="pi-name">{p.name}</div>
                  <div className="pi-sub">{summarize(p.config)}</div>
                </div>
                <button
                  className="icon-btn"
                  onClick={() => onDelete(p.id)}
                  aria-label="delete preset"
                >
                  <Icon.Trash />
                </button>
                <button
                  className="icon-btn apply"
                  onClick={() => {
                    onApply(p.config);
                    onClose();
                  }}
                  aria-label="use preset"
                >
                  <Icon.Apply />
                </button>
              </div>
            ))}
          </>
        )}

        <h3>Templates</h3>
        {TEMPLATES.map((tpl) => (
          <div className="preset-item" key={tpl.name}>
            <div className="pi-main">
              <div className="pi-name">{tpl.name}</div>
              <div className="pi-sub">{summarize(tpl.config)}</div>
            </div>
            <button
              className="icon-btn apply"
              onClick={() => {
                onApply(tpl.config);
                onClose();
              }}
              aria-label="use template"
            >
              <Icon.Apply />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
