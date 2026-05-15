import type { Segment, WorkoutConfig } from "../types";

export const DEFAULT_CONFIG: WorkoutConfig = {
  prepare: 10,
  work: 40,
  rest: 20,
  cycles: 4,
  sets: 1,
  restBetweenSets: 60,
  cooldown: 0,
  workDescription: "",
  restDescription: "",
};

// Builds the flat ordered list of segments for a workout.
// A rest is only inserted when another work bout follows; a longer
// "rest between sets" replaces the per-cycle rest at set boundaries.
export function buildTimeline(c: WorkoutConfig): Segment[] {
  const segments: Segment[] = [];
  const sets = Math.max(1, c.sets);
  const cycles = Math.max(1, c.cycles);

  if (c.prepare > 0) {
    segments.push({
      phase: "prepare",
      duration: c.prepare,
      label: "Get Ready",
      cycle: 0,
      totalCycles: cycles,
      set: 0,
      totalSets: sets,
    });
  }

  for (let s = 1; s <= sets; s++) {
    for (let cy = 1; cy <= cycles; cy++) {
      segments.push({
        phase: "work",
        duration: Math.max(1, c.work),
        label: "Work",
        description: c.workDescription || undefined,
        cycle: cy,
        totalCycles: cycles,
        set: s,
        totalSets: sets,
      });

      const moreInSet = cy < cycles;
      const moreSets = s < sets;

      if (moreInSet && c.rest > 0) {
        segments.push({
          phase: "rest",
          duration: c.rest,
          label: "Rest",
          description: c.restDescription || undefined,
          cycle: cy,
          totalCycles: cycles,
          set: s,
          totalSets: sets,
        });
      } else if (!moreInSet && moreSets && c.restBetweenSets > 0) {
        segments.push({
          phase: "restset",
          duration: c.restBetweenSets,
          label: "Set Break",
          cycle: cy,
          totalCycles: cycles,
          set: s,
          totalSets: sets,
        });
      }
    }
  }

  if (c.cooldown > 0) {
    segments.push({
      phase: "cooldown",
      duration: c.cooldown,
      label: "Cooldown",
      cycle: 0,
      totalCycles: cycles,
      set: 0,
      totalSets: sets,
    });
  }

  return segments;
}

export function totalDuration(segments: Segment[]): number {
  return segments.reduce((sum, s) => sum + s.duration, 0);
}

export function workDuration(segments: Segment[]): number {
  return segments.filter((s) => s.phase === "work").reduce((sum, s) => sum + s.duration, 0);
}
