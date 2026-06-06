import type { Settings } from "../types";
import { audio } from "../lib/audio";

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button className={`switch${on ? " on" : ""}`} onClick={onClick} aria-pressed={on}>
      <i />
    </button>
  );
}

export function SettingsScreen({ settings, onChange }: Props) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    onChange({ ...settings, [k]: v });

  return (
    <>
      <div className="section-label">Sound</div>
      <div className="card">
        <div className="set-row">
          <div className="set-main">
            <div className="set-title">Sound effects</div>
            <div className="set-sub">Beeps on phase changes</div>
          </div>
          <Toggle on={settings.sound} onClick={() => set("sound", !settings.sound)} />
        </div>
        <div className="set-row">
          <div className="set-main">
            <div className="set-title">Countdown beeps</div>
            <div className="set-sub">Tick the last 3 seconds</div>
          </div>
          <Toggle
            on={settings.countdownBeeps}
            onClick={() => set("countdownBeeps", !settings.countdownBeeps)}
          />
        </div>
        <div className="set-row">
          <div className="set-main">
            <div className="set-title">Voice cues</div>
            <div className="set-sub">Speak “Work”, “Rest”, etc.</div>
          </div>
          <Toggle on={settings.voice} onClick={() => set("voice", !settings.voice)} />
        </div>
        <div className="set-row">
          <div className="set-main">
            <div className="set-title">Volume</div>
            <div className="set-sub">{Math.round(settings.volume * 100)}%</div>
          </div>
          <input
            className="slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => set("volume", Number(e.target.value))}
            onPointerUp={() => {
              audio.setVolume(settings.volume);
              audio.cue("work");
            }}
          />
        </div>
        <div className="note">
          On iPhone, the physical <b>Ring/Silent</b> switch also mutes the app’s
          sound. If you hear nothing, flip it off (no orange) and tap the volume
          slider above to test.
        </div>
      </div>

      <div className="section-label">Workout</div>
      <div className="card">
        <div className="set-row">
          <div className="set-main">
            <div className="set-title">Keep screen awake</div>
            <div className="set-sub">Prevent lock during a workout</div>
          </div>
          <Toggle on={settings.keepAwake} onClick={() => set("keepAwake", !settings.keepAwake)} />
        </div>
        <div className="set-row">
          <div className="set-main">
            <div className="set-title">Theme</div>
            <div className="set-sub">App appearance</div>
          </div>
          <div className="seg">
            {(["system", "light", "dark"] as const).map((th) => (
              <button
                key={th}
                className={settings.theme === th ? "active" : ""}
                onClick={() => set("theme", th)}
              >
                {th[0].toUpperCase() + th.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="section-label">Apple Health</div>
      <div className="card">
        <div className="note">
          Safari can’t write to Apple Health directly, so Tabatica keeps your full
          workout history in the app. To get sessions into Health: open{" "}
          <b>History → Export CSV</b>, then use a free <b>Apple Shortcut</b> with the{" "}
          <b>“Log Health Sample”</b> action set to <b>Workout → High Intensity
          Interval Training</b>, reading the duration from each row. Add Tabatica to
          your Home Screen (Share → <b>Add to Home Screen</b>) to run it full-screen
          like a native app, fully offline.
        </div>
      </div>

      <div className="note" style={{ textAlign: "center", opacity: 0.7 }}>
        Tabatica · interval training timer
      </div>
    </>
  );
}
