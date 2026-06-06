import { useEffect, useMemo, useState } from "react";
import { ConfigScreen } from "./components/ConfigScreen";
import { RunScreen } from "./components/RunScreen";
import { HistoryScreen } from "./components/HistoryScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { PresetsSheet } from "./components/PresetsSheet";
import * as Icon from "./components/icons";
import { audio } from "./lib/audio";
import {
  loadConfig,
  loadHistory,
  loadPresets,
  loadSettings,
  saveConfig,
  saveHistory,
  savePresets,
  saveSettings,
  uid,
} from "./lib/storage";
import { buildTimeline, totalDuration, workDuration } from "./lib/timeline";
import { formatClock } from "./lib/format";
import { initSessionTracking, pwaMode, track } from "./lib/analytics";
import type { HistoryEntry, Preset, Settings, WorkoutConfig } from "./types";

type View = "timer" | "history" | "settings";

const sameConfig = (a: WorkoutConfig, b: WorkoutConfig) =>
  a.prepare === b.prepare &&
  a.work === b.work &&
  a.rest === b.rest &&
  a.cycles === b.cycles &&
  a.sets === b.sets &&
  a.restBetweenSets === b.restBetweenSets &&
  a.cooldown === b.cooldown;

export default function App() {
  const [config, setConfig] = useState<WorkoutConfig>(loadConfig);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [presets, setPresets] = useState<Preset[]>(loadPresets);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [view, setView] = useState<View>("timer");
  const [running, setRunning] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);

  useEffect(() => saveConfig(config), [config]);
  useEffect(() => savePresets(presets), [presets]);
  useEffect(() => saveHistory(history), [history]);
  useEffect(() => {
    saveSettings(settings);
    audio.enabled = settings.sound;
    audio.voiceEnabled = settings.voice;
    audio.setVolume(settings.volume);
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  // Analytics session + ?admin=1 toggle (persists to localStorage so the
  // Admin section shows in Settings; ?admin=0 turns it off).
  useEffect(() => {
    initSessionTracking();
    try {
      const url = new URL(window.location.href);
      const admin = url.searchParams.get("admin");
      if (admin === "1") {
        localStorage.setItem("tabatica.admin", "1");
        url.searchParams.delete("admin");
        window.history.replaceState({}, "", url.toString());
      } else if (admin === "0") {
        localStorage.removeItem("tabatica.admin");
        url.searchParams.delete("admin");
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      /* non-fatal */
    }
  }, []);

  const segments = useMemo(() => buildTimeline(config), [config]);
  const total = useMemo(() => totalDuration(segments), [segments]);

  const workoutName = useMemo(() => {
    const p = presets.find((pr) => sameConfig(pr.config, config));
    return p ? p.name : "Custom Workout";
  }, [presets, config]);

  const start = () => {
    audio.enabled = settings.sound;
    audio.voiceEnabled = settings.voice;
    audio.setVolume(settings.volume);
    void audio.unlock();
    track("workout_started", {
      preset: workoutName,
      work: config.work,
      rest: config.rest,
      cycles: config.cycles,
      sets: config.sets,
      totalSeconds: total,
      mode: pwaMode(),
    });
    setRunning(true);
  };

  const handleSave = (activeSeconds: number, completed: boolean) => {
    const entry: HistoryEntry = {
      id: uid(),
      name: workoutName,
      date: Date.now(),
      totalSeconds: total,
      activeSeconds,
      workSeconds: workDuration(segments),
      cycles: config.cycles,
      sets: config.sets,
      completed,
    };
    setHistory((h) => [entry, ...h]);
    track("workout_completed", {
      preset: workoutName,
      completed,
      activeSeconds,
      totalSeconds: total,
      cycles: config.cycles,
      sets: config.sets,
      mode: pwaMode(),
    });
  };

  const savePreset = (name: string) => {
    setPresets((p) => [
      { id: uid(), name, config: { ...config }, createdAt: Date.now() },
      ...p,
    ]);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div className="brand">
            <Icon.Logo />
            Tabatica
          </div>
          <div style={{ fontSize: 13, opacity: 0.9, fontWeight: 600 }}>
            {view === "timer" ? "Interval Timer" : view === "history" ? "Your Progress" : "Settings"}
          </div>
        </div>
        {view === "timer" && (
          <div className="summary">
            <div className="pill">
              <span className="num">{formatClock(total)}</span>
              <span className="lbl">Total time</span>
            </div>
            <div className="pill">
              <span className="num">{segments.length}</span>
              <span className="lbl">Intervals</span>
            </div>
            <div className="pill">
              <span className="num">
                {config.cycles}×{config.sets}
              </span>
              <span className="lbl">Cycles · Sets</span>
            </div>
          </div>
        )}
      </header>

      <main className={`content${view === "timer" ? " content--timer" : ""}`}>
        {view === "timer" && (
          <ConfigScreen
            config={config}
            onChange={setConfig}
            onOpenPresets={() => setPresetsOpen(true)}
          />
        )}
        {view === "history" && (
          <HistoryScreen
            history={history}
            onDelete={(id) => setHistory((h) => h.filter((x) => x.id !== id))}
            onClear={() => setHistory([])}
          />
        )}
        {view === "settings" && (
          <SettingsScreen settings={settings} onChange={setSettings} />
        )}
      </main>

      <div className="dock">
        {view === "timer" && (
          <div className="dock-start">
            <button className="btn-primary" onClick={start}>
              <Icon.Play style={{ width: 22, height: 22 }} />
              START
            </button>
          </div>
        )}
        <nav className="tabbar">
          <button
            className={`tab${view === "timer" ? " active" : ""}`}
            onClick={() => setView("timer")}
          >
            <Icon.TimerTab />
            Timer
          </button>
          <button
            className={`tab${view === "history" ? " active" : ""}`}
            onClick={() => setView("history")}
          >
            <Icon.HistoryTab />
            History
          </button>
          <button
            className={`tab${view === "settings" ? " active" : ""}`}
            onClick={() => setView("settings")}
          >
            <Icon.SettingsTab />
            Settings
          </button>
        </nav>
      </div>

      {running && (
        <RunScreen
          segments={segments}
          settings={settings}
          name={workoutName}
          onComplete={(active) => handleSave(active, true)}
          onClose={() => setRunning(false)}
        />
      )}

      {presetsOpen && (
        <PresetsSheet
          presets={presets}
          current={config}
          onApply={setConfig}
          onSave={savePreset}
          onDelete={(id) => setPresets((p) => p.filter((x) => x.id !== id))}
          onClose={() => setPresetsOpen(false)}
        />
      )}
    </div>
  );
}
