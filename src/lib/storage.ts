import type { HistoryEntry, Preset, Settings, WorkoutConfig } from "../types";
import { DEFAULT_CONFIG } from "./timeline";

const KEYS = {
  config: "tabatica.config",
  presets: "tabatica.presets",
  history: "tabatica.history",
  settings: "tabatica.settings",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...(fallback as object), ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — non-fatal */
  }
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  voice: false,
  volume: 0.8,
  countdownBeeps: true,
  keepAwake: true,
  theme: "system",
};

export const loadConfig = (): WorkoutConfig => read(KEYS.config, DEFAULT_CONFIG);
export const saveConfig = (c: WorkoutConfig) => write(KEYS.config, c);

export const loadSettings = (): Settings => read(KEYS.settings, DEFAULT_SETTINGS);
export const saveSettings = (s: Settings) => write(KEYS.settings, s);

export const loadPresets = (): Preset[] => readArray<Preset>(KEYS.presets);
export const savePresets = (p: Preset[]) => write(KEYS.presets, p);

export const loadHistory = (): HistoryEntry[] =>
  readArray<HistoryEntry>(KEYS.history).sort((a, b) => b.date - a.date);
export const saveHistory = (h: HistoryEntry[]) => write(KEYS.history, h);

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
