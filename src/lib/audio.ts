// Sound + voice cues. The AudioContext is created lazily and resumed from a
// user gesture (the START button) so it works under iOS Safari's autoplay
// rules. A near-silent keep-alive node runs for the whole workout so iOS
// doesn't suspend the context during quiet phases — otherwise the beep right
// before "Work" gets dropped because resume() is async.
type Tone = { freq: number; dur: number; type?: OscillatorType; gain?: number };

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private keepAlive: { osc: OscillatorNode; gain: GainNode } | null = null;
  enabled = true;
  voiceEnabled = false;
  volume = 0.8;

  private ensure() {
    if (this.ctx) return this.ctx;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  private resume() {
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  // Keeps the audio hardware/route active so scheduled beeps fire on time
  // even after a long silent phase (iOS would otherwise suspend the context).
  private startKeepAlive() {
    if (this.keepAlive) return;
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 60;
    gain.gain.value = 0.0001; // inaudible but enough to keep the context awake
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    this.keepAlive = { osc, gain };
  }

  private stopKeepAlive() {
    if (!this.keepAlive) return;
    try {
      this.keepAlive.osc.stop();
      this.keepAlive.osc.disconnect();
      this.keepAlive.gain.disconnect();
    } catch {
      /* already stopped */
    }
    this.keepAlive = null;
  }

  // Call from a user gesture (START tap) before the workout begins.
  async unlock() {
    const ctx = this.ensure();
    if (ctx.state === "suspended") await ctx.resume();
    this.startKeepAlive();
    if (this.voiceEnabled && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  }

  // Call when the workout screen closes.
  endSession() {
    this.stopKeepAlive();
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx) this.master.gain.setValueAtTime(v, this.ctx.currentTime);
  }

  private play(tones: Tone[]) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    this.resume();
    // Start a hair in the future so the first tone isn't clipped while the
    // context finishes resuming.
    let t = ctx.currentTime + 0.03;
    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = tone.type ?? "sine";
      osc.frequency.setValueAtTime(tone.freq, t);
      const peak = (tone.gain ?? 1) * this.volume;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + tone.dur);
      osc.connect(g).connect(this.master ?? ctx.destination);
      osc.start(t);
      osc.stop(t + tone.dur + 0.02);
      t += tone.dur;
    }
  }

  // Frequencies sit in the 0.8–1.5 kHz band where hearing is most sensitive,
  // with square/triangle waves and high gain so cues cut through during a
  // workout (and over a phone speaker).
  countdownTick() {
    this.play([{ freq: 1000, dur: 0.16, type: "square", gain: 0.95 }]);
  }

  cue(phase: "work" | "rest" | "restset" | "prepare" | "cooldown") {
    if (phase === "work") {
      // Loud rising double-blast — unmistakable "go".
      this.play([
        { freq: 780, dur: 0.16, type: "square", gain: 0.95 },
        { freq: 1240, dur: 0.34, type: "square", gain: 1 },
      ]);
    } else if (phase === "cooldown") {
      this.play([
        { freq: 720, dur: 0.2, type: "triangle", gain: 0.85 },
        { freq: 480, dur: 0.34, type: "triangle", gain: 0.85 },
      ]);
    } else {
      // Rest / prepare / set break — clear descending two-tone.
      this.play([
        { freq: 940, dur: 0.18, type: "triangle", gain: 0.9 },
        { freq: 620, dur: 0.3, type: "triangle", gain: 0.9 },
      ]);
    }
  }

  finish() {
    this.play([
      { freq: 660, dur: 0.18, type: "triangle", gain: 0.9 },
      { freq: 880, dur: 0.18, type: "triangle", gain: 0.9 },
      { freq: 1175, dur: 0.18, type: "triangle", gain: 0.95 },
      { freq: 1568, dur: 0.5, type: "triangle", gain: 1 },
    ]);
  }

  speak(text: string) {
    if (!this.voiceEnabled || !this.enabled || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.volume = Math.min(1, this.volume + 0.2);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }
}

export const audio = new AudioEngine();
