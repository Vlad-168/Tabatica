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

  const endRef = useRef<number | null>(null); // performance.now() ms when segment ends
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

  const enterSegment = useCallback((i: number, run: boolean, cue: boolean) => {
    const seg = segsRef.current[i];
    if (!seg) return;
    idxRef.current = i;
    beepRef.current = -1;
    remainingRef.current = seg.duration;
    setIdx(i);
    setRemaining(seg.duration);
    if (cue) {
      audio.cue(seg.phase === "done" ? "cooldown" : seg.phase);
      audio.speak(voiceLabel[seg.phase]);
    }
    endRef.current = run ? performance.now() + seg.duration * 1000 : null;
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
    const rem = (endRef.current - performance.now()) / 1000;
    if (rem <= 0) {
      const next = idxRef.current + 1;
      if (next < segsRef.current.length) enterSegment(next, true, true);
      else finish();
      return;
    }
    remainingRef.current = rem;
    setRemaining(rem);
    const secInt = Math.ceil(rem);
    if (settingsRef.current.countdownBeeps && secInt <= 3 && secInt >= 1 && secInt !== beepRef.current) {
      beepRef.current = secInt;
      audio.countdownTick();
    }
  }, [enterSegment, finish]);

  const startTick = useCallback(() => {
    clearTick();
    tickRef.current = setInterval(tick, 100);
  }, [clearTick, tick]);

  const start = useCallback(() => {
    enterSegment(0, true, true);
    setStatus("running");
    startTick();
  }, [enterSegment, startTick]);

  const pause = useCallback(() => {
    if (endRef.current != null) {
      remainingRef.current = Math.max(0, (endRef.current - performance.now()) / 1000);
      setRemaining(remainingRef.current);
    }
    endRef.current = null;
    clearTick();
    setStatus("paused");
  }, [clearTick]);

  const resume = useCallback(() => {
    endRef.current = performance.now() + remainingRef.current * 1000;
    setStatus("running");
    startTick();
  }, [startTick]);

  const stop = useCallback(() => {
    clearTick();
    enterSegment(0, false, false);
    setStatus("idle");
  }, [clearTick, enterSegment]);

  const jump = useCallback(
    (delta: number) => {
      const target = Math.min(
        segsRef.current.length - 1,
        Math.max(0, idxRef.current + delta),
      );
      if (target === idxRef.current) return;
      const run = status === "running";
      enterSegment(target, run, true);
      if (run) startTick();
    },
    [enterSegment, startTick, status],
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
