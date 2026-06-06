import { useMemo, useRef, useState } from "react";
import type { Settings } from "../types";
import { audio } from "../lib/audio";
import { deviceInfo, pwaMode } from "../lib/analytics";
import { checkPasscode } from "../lib/adminPasscode";
import { AdminDashboard } from "./AdminDashboard";

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
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem("tabatica.admin") === "1";
    } catch {
      return false;
    }
  });
  const tapsRef = useRef<number[]>([]);
  const [prompt, setPrompt] = useState(false);
  const [pcInput, setPcInput] = useState("");
  const [pcWrong, setPcWrong] = useState(false);
  const grantAdmin = (on: boolean) => {
    try {
      if (on) localStorage.setItem("tabatica.admin", "1");
      else localStorage.removeItem("tabatica.admin");
    } catch {
      /* private mode — non-fatal */
    }
    setIsAdmin(on);
  };
  const onFooterTap = () => {
    const now = Date.now();
    tapsRef.current = tapsRef.current.filter((t) => now - t < 2500);
    tapsRef.current.push(now);
    if (tapsRef.current.length >= 7) {
      tapsRef.current = [];
      if (isAdmin) grantAdmin(false);
      else {
        setPcInput("");
        setPcWrong(false);
        setPrompt(true);
      }
    }
  };
  const tryUnlock = async () => {
    const ok = await checkPasscode(pcInput);
    if (ok) {
      grantAdmin(true);
      setPrompt(false);
      setPcInput("");
      setPcWrong(false);
    } else {
      setPcInput("");
      setPcWrong(true);
    }
  };
  const env = useMemo(() => {
    const info = deviceInfo();
    return { mode: pwaMode(), ...info };
  }, []);
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem("tabatica.umamiApiKey") ?? "";
    } catch {
      return "";
    }
  });
  const [keyInput, setKeyInput] = useState("");
  const saveKey = () => {
    const v = keyInput.trim();
    if (!v) return;
    try {
      localStorage.setItem("tabatica.umamiApiKey", v);
    } catch {
      /* ignore */
    }
    setApiKey(v);
    setKeyInput("");
  };
  const clearKey = () => {
    try {
      localStorage.removeItem("tabatica.umamiApiKey");
    } catch {
      /* ignore */
    }
    setApiKey("");
  };

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
                <div className="set-title">Open Umami</div>
                <div className="set-sub">Full dashboard in a new tab</div>
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

          {apiKey ? (
            <AdminDashboard apiKey={apiKey} onClearKey={clearKey} />
          ) : (
            <div className="card">
              <div className="set-row">
                <div className="set-main">
                  <div className="set-title">In-app stats</div>
                  <div className="set-sub">
                    Paste a Umami API key (Profile → API Keys on cloud.umami.is) to
                    show a 7-day summary here. Key is stored only on this device.
                  </div>
                </div>
              </div>
              <div className="field" style={{ padding: "0 16px 14px" }}>
                <input
                  type="password"
                  value={keyInput}
                  placeholder="Umami API key…"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveKey()}
                />
                <button onClick={saveKey}>Save</button>
              </div>
            </div>
          )}
        </>
      )}

      <div
        className="note"
        style={{ textAlign: "center", opacity: 0.7, userSelect: "none", WebkitTapHighlightColor: "transparent" }}
        onClick={onFooterTap}
      >
        Tabatica · interval training timer
      </div>

      {prompt && (
        <div className="sheet-backdrop" onClick={() => setPrompt(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <h3>Enter passcode</h3>
            <div className="field">
              <input
                type="password"
                autoFocus
                value={pcInput}
                placeholder="Passcode"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => {
                  setPcInput(e.target.value);
                  if (pcWrong) setPcWrong(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && void tryUnlock()}
              />
              <button onClick={() => void tryUnlock()}>Unlock</button>
            </div>
            {pcWrong && (
              <div className="note" style={{ color: "#ef4444", padding: "0 4px 4px" }}>
                Incorrect
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
