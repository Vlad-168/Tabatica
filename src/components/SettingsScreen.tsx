import { useMemo } from "react";
import type { Settings } from "../types";
import { audio } from "../lib/audio";
import { deviceInfo, pwaMode } from "../lib/analytics";

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

const UMAMI_DASHBOARD =
  "https://cloud.umami.is/websites/76e4a2ec-48bd-4017-afad-e5170f0c9640";

export function SettingsScreen({ settings, onChange }: Props) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    onChange({ ...settings, [k]: v });
  const isAdmin = useMemo(() => {
    try {
      return localStorage.getItem("tabatica.admin") === "1";
    } catch {
      return false;
    }
  }, []);
  const env = useMemo(() => {
    const info = deviceInfo();
    return { mode: pwaMode(), ...info };
  }, []);

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

      {isAdmin && (
        <>
          <div className="section-label">Admin</div>
          <div className="card">
            <div className="set-row">
              <div className="set-main">
                <div className="set-title">Analytics dashboard</div>
                <div className="set-sub">Open Umami in a new tab</div>
              </div>
              <button
                className="icon-btn apply"
                onClick={() => window.open(UMAMI_DASHBOARD, "_blank", "noopener,noreferrer")}
                aria-label="open dashboard"
              >
                ↗
              </button>
            </div>
            <div className="set-row">
              <div className="set-main">
                <div className="set-title">This device</div>
                <div className="set-sub">
                  {env.platform} · {env.browser} · {env.mode}
                </div>
              </div>
            </div>
            <div className="note">
              Append <b>?admin=0</b> to the URL once to hide this section again.
            </div>
          </div>
        </>
      )}

      <div className="note" style={{ textAlign: "center", opacity: 0.7 }}>
        Tabatica · interval training timer
      </div>
    </>
  );
}
