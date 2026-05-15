export interface WorkoutConfig {
  prepare: number;
  work: number;
  rest: number;
  cycles: number;
  sets: number;
  restBetweenSets: number;
  cooldown: number;
  workDescription: string;
  restDescription: string;
}

export interface Preset {
  id: string;
  name: string;
  config: WorkoutConfig;
  createdAt: number;
}

export type Phase = "prepare" | "work" | "rest" | "restset" | "cooldown" | "done";

export interface Segment {
  phase: Phase;
  duration: number;
  label: string;
  description?: string;
  cycle: number; // 1-based, 0 for non cycle phases
  totalCycles: number;
  set: number; // 1-based, 0 for non set phases
  totalSets: number;
}

export interface HistoryEntry {
  id: string;
  name: string;
  date: number; // epoch ms when finished
  totalSeconds: number; // planned total duration
  activeSeconds: number; // work + rest + cooldown actually elapsed (excludes prepare)
  workSeconds: number;
  cycles: number;
  sets: number;
  completed: boolean;
}

export interface Settings {
  sound: boolean;
  voice: boolean;
  volume: number; // 0..1
  countdownBeeps: boolean;
  keepAwake: boolean;
  theme: "system" | "light" | "dark";
}
