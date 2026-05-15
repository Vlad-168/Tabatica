import type { WorkoutConfig } from "../types";
import { Stepper } from "./Stepper";
import * as Icon from "./icons";
import { formatClock } from "../lib/format";

interface Props {
  config: WorkoutConfig;
  onChange: (c: WorkoutConfig) => void;
  onStart: () => void;
  onOpenPresets: () => void;
}

function grad(c: string, c2: string) {
  return `linear-gradient(135deg, var(${c}), var(${c2}))`;
}

export function ConfigScreen({ config, onChange, onStart, onOpenPresets }: Props) {
  const set = <K extends keyof WorkoutConfig>(k: K, v: WorkoutConfig[K]) =>
    onChange({ ...config, [k]: v });

  const secs = (v: number) => formatClock(v);

  return (
    <>
      <div className="card">
        <div className="row">
          <div className="row-icon" style={{ background: grad("--prepare", "--prepare-2") }}>
            <Icon.Prepare />
          </div>
          <div className="row-main">
            <div className="row-title">Prepare</div>
            <div className="row-desc">Warm-up before the first round</div>
          </div>
          <Stepper value={config.prepare} onChange={(v) => set("prepare", v)} min={0} max={120} step={5} format={secs} />
        </div>

        <div className="row">
          <div className="row-icon" style={{ background: grad("--work", "--work-2") }}>
            <Icon.Work />
          </div>
          <div className="row-main">
            <div className="row-title">Work</div>
            <input
              className="row-desc"
              value={config.workDescription}
              placeholder="Add description"
              onChange={(e) => set("workDescription", e.target.value)}
              style={!config.workDescription ? { color: "color-mix(in srgb, var(--brand) 70%, var(--text-dim))" } : undefined}
            />
          </div>
          <Stepper value={config.work} onChange={(v) => set("work", v)} min={1} max={900} step={5} format={secs} />
        </div>

        <div className="row">
          <div className="row-icon" style={{ background: grad("--rest", "--rest-2") }}>
            <Icon.Rest />
          </div>
          <div className="row-main">
            <div className="row-title">Rest</div>
            <input
              className="row-desc"
              value={config.restDescription}
              placeholder="Add description"
              onChange={(e) => set("restDescription", e.target.value)}
              style={!config.restDescription ? { color: "color-mix(in srgb, var(--brand) 70%, var(--text-dim))" } : undefined}
            />
          </div>
          <Stepper value={config.rest} onChange={(v) => set("rest", v)} min={0} max={600} step={5} format={secs} />
        </div>

        <div className="row">
          <div className="row-icon" style={{ background: grad("--restset", "--restset-2") }}>
            <Icon.Cycle />
          </div>
          <div className="row-main">
            <div className="row-title">Cycles</div>
            <div className="row-desc">Work + rest rounds per set</div>
          </div>
          <Stepper value={config.cycles} onChange={(v) => set("cycles", v)} min={1} max={50} />
        </div>

        <div className="row">
          <div className="row-icon" style={{ background: grad("--cooldown", "--cooldown-2") }}>
            <Icon.Sets />
          </div>
          <div className="row-main">
            <div className="row-title">Sets</div>
            <div className="row-desc">Repeat the whole block</div>
          </div>
          <Stepper value={config.sets} onChange={(v) => set("sets", v)} min={1} max={20} />
        </div>

        <div className="row">
          <div className="row-icon" style={{ background: grad("--restset", "--restset-2") }}>
            <Icon.SetBreak />
          </div>
          <div className="row-main">
            <div className="row-title">Set Break</div>
            <div className="row-desc">Longer rest between sets</div>
          </div>
          <Stepper value={config.restBetweenSets} onChange={(v) => set("restBetweenSets", v)} min={0} max={600} step={10} format={secs} />
        </div>

        <div className="row">
          <div className="row-icon" style={{ background: grad("--cooldown", "--cooldown-2") }}>
            <Icon.Cooldown />
          </div>
          <div className="row-main">
            <div className="row-title">Cooldown</div>
            <div className="row-desc">Stretch at the very end</div>
          </div>
          <Stepper value={config.cooldown} onChange={(v) => set("cooldown", v)} min={0} max={600} step={10} format={secs} />
        </div>
      </div>

      <button className="btn-ghost" onClick={onOpenPresets}>
        <Icon.Save />
        Presets & saved workouts
      </button>

      <button className="btn-primary pop" onClick={onStart}>
        <Icon.Play style={{ width: 22, height: 22 }} />
        START
      </button>
    </>
  );
}
