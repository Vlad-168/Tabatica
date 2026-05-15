import { useCallback, useEffect, useRef, useState } from "react";
import { audio } from "../lib/audio";
import type { Segment, Settings } from "../types";

type Status = "idle" | "running" | "paused" | "done";

interface Options {
  segments: Segment[];
  settings: Settings;
  onComplete: (activeSeconds: number) => void;
}

const voiceLabel: Record<Segment["phase"], string> = {
  prepare: "Get ready",
  work: "Work",
  rest: "Rest",
  restset: "Set break",
  cooldown: "Cool down",
  done: "Workout complete",
};

export function useTimer({ segments, settings, onComplete }: Options) {
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [remaining, setRemaining] = useState(segments[0]?.duration ?? 0);

  // Absolute wall-clock (Date.now) ms when the current segment ends. Using
  // wall time (not performance.now) means that if iOS suspends the tab while
  // backgrounded, the timer self-corrects to the right phase on return.
  const endRef = useRef<number | null>(null);
  const remainingRef = useRef(segments[0]?.duration ?? 0);
  const beepRef = useRef(-1);
  const idxRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const segsRef = useRef(segments);
  segsRef.current = segments;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const clearTick = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  }, []);

  const activeElapsed = useCallback(() => {
    const segs = segsRef.current;
    const cur = idxRef.current;
    let sum = 0;
    for (let i = 0; i < cur && i < segs.length; i++) {
      if (segs[i].phase !== "prepare") sum += segs[i].duration;
    }
    const seg = segs[cur];
    if (seg && seg.phase !== "prepare") {
      sum += seg.duration - Math.max(0, remainingRef.current);
    }
    return Math.round(sum);
  }, []);

  // Update visible phase (and optionally fire its sound cue). Does NOT touch
  // the schedule (endRef) — scheduling stays absolute so background gaps and
  // drift don't accumulate.
  const showSegment = useCallback((i: number, cue: boolean) => {
    const seg = segsRef.current[i];
    if (!seg) return;
    idxRef.current = i;
    beepRef.current = -1;
    setIdx(i);
    if (cue) {
      audio.cue(seg.phase === "done" ? "cooldown" : seg.phase);
      audio.speak(voiceLabel[seg.phase]);
    }
  }, []);

  const finish = useCallback(() => {
    clearTick();
    endRef.current = null;
    remainingRef.current = 0;
    setStatus("done");
    setRemaining(0);
    audio.finish();
    audio.speak(voiceLabel.done);
    const total = segsRef.current.reduce(
      (s, seg) => s + (seg.phase === "prepare" ? 0 : seg.duration),
      0,
    );
    onCompleteRef.current(Math.round(total));
  }, [clearTick]);

  const tick = useCallback(() => {
    if (endRef.current == null) return;
    const now = Date.now();

    if (now < endRef.current) {
      const rem = (endRef.current - now) / 1000;
      remainingRef.current = rem;
      setRemaining(rem);
      const s = Math.ceil(rem);
      if (
        settingsRef.current.countdownBeeps &&
        s <= 3 &&
        s >= 1 &&
        s !== beepRef.current
      ) {
        beepRef.current = s;
        audio.countdownTick();
      }
      return;
    }

    // Current segment ended. Advance — possibly across several segments if
    // the app was backgrounded for a while — landing on the live one.
    for (;;) {
      const next = idxRef.current + 1;
      if (next >= segsRef.current.length) {
        finish();
        return;
      }
      endRef.current += segsRef.current[next].duration * 1000;
      const landed = Date.now() < endRef.current;
      showSegment(next, landed);
      if (landed) {
        const rem = (endRef.current - Date.now()) / 1000;
        remainingRef.current = rem;
        setRemaining(rem);
        return;
      }
    }
  }, [finish, showSegment]);

  const tickFnRef = useRef(tick);
  tickFnRef.current = tick;

  const startTick = useCallback(() => {
    clearTick();
    tickRef.current = setInterval(() => tickFnRef.current(), 100);
  }, [clearTick]);

  const start = useCallback(() => {
    const seg = segsRef.current[0];
    idxRef.current = 0;
    beepRef.current = -1;
    remainingRef.current = seg?.duration ?? 0;
    endRef.current = Date.now() + (seg?.duration ?? 0) * 1000;
    setIdx(0);
    setRemaining(seg?.duration ?? 0);
    if (seg) {
      audio.cue(seg.phase === "done" ? "cooldown" : seg.phase);
      audio.speak(voiceLabel[seg.phase]);
    }
    setStatus("running");
    startTick();
  }, [startTick]);

  const pause = useCallback(() => {
    if (endRef.current != null) {
      remainingRef.current = Math.max(0, (endRef.current - Date.now()) / 1000);
      setRemaining(remainingRef.current);
    }
    endRef.current = null;
    clearTick();
    setStatus("paused");
  }, [clearTick]);

  const resume = useCallback(() => {
    endRef.current = Date.now() + remainingRef.current * 1000;
    setStatus("running");
    startTick();
  }, [startTick]);

  const stop = useCallback(() => {
    clearTick();
    endRef.current = null;
    idxRef.current = 0;
    beepRef.current = -1;
    remainingRef.current = segsRef.current[0]?.duration ?? 0;
    setIdx(0);
    setRemaining(segsRef.current[0]?.duration ?? 0);
    setStatus("idle");
  }, [clearTick]);

  const jump = useCallback(
    (delta: number) => {
      const target = Math.min(
        segsRef.current.length - 1,
        Math.max(0, idxRef.current + delta),
      );
      if (target === idxRef.current) return;
      const seg = segsRef.current[target];
      remainingRef.current = seg.duration;
      setRemaining(seg.duration);
      if (status === "running") {
        endRef.current = Date.now() + seg.duration * 1000;
      }
      showSegment(target, true);
    },
    [showSegment, status],
  );

  const toggle = useCallback(() => {
    if (status === "running") pause();
    else if (status === "paused") resume();
    else if (status === "done") {
      stop();
      start();
    } else start();
  }, [status, pause, resume, stop, start]);

  useEffect(() => clearTick, [clearTick]);

  // Resync immediately when returning to the app (don't wait for the next
  // throttled interval) so the phase/time jump to where they should be.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && tickRef.current) {
        tickFnRef.current();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Reset to the start when the workout definition changes while idle.
  useEffect(() => {
    if (status === "idle") {
      idxRef.current = 0;
      remainingRef.current = segments[0]?.duration ?? 0;
      setIdx(0);
      setRemaining(segments[0]?.duration ?? 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments]);

  return {
    idx,
    status,
    segment: segments[idx],
    remaining,
    running: status === "running",
    paused: status === "paused",
    finished: status === "done",
    start,
    pause,
    resume,
    stop,
    toggle,
    next: () => jump(1),
    prev: () => jump(-1),
    activeElapsed,
  };
}
