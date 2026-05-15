// Sound + voice cues. The AudioContext is created lazily and resumed from a
// user gesture (the START button) so it works under iOS Safari's autoplay rules.
type Tone = { freq: number; dur: number; type?: OscillatorType; gain?: number };

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;
  voiceEnabled = false;
  volume = 0.8;

  private ensure() {
    if (this.ctx) return this.ctx;
    const Ctx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  // Call from a user gesture before the workout starts.
  async unlock() {
    const ctx = this.ensure();
    if (ctx.state === "suspended") await ctx.resume();
    // Prime speech synthesis on iOS with a near-silent utterance.
    if (this.voiceEnabled && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance("");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx) this.master.gain.setValueAtTime(v, this.ctx.currentTime);
  }

  private play(tones: Tone[]) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (ctx.state === "suspended") void ctx.resume();
    let t = ctx.currentTime;
    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = tone.type ?? "sine";
      osc.frequency.setValueAtTime(tone.freq, t);
      const peak = (tone.gain ?? 1) * this.volume;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + tone.dur);
      osc.connect(g).connect(this.master ?? ctx.destination);
      osc.start(t);
      osc.stop(t + tone.dur + 0.02);
      t += tone.dur;
    }
  }

  countdownTick() {
    this.play([{ freq: 760, dur: 0.12, type: "triangle", gain: 0.5 }]);
  }

  cue(phase: "work" | "rest" | "restset" | "prepare" | "cooldown") {
    if (phase === "work") {
      this.play([
        { freq: 660, dur: 0.12, type: "square", gain: 0.45 },
        { freq: 990, dur: 0.22, type: "square", gain: 0.5 },
      ]);
    } else if (phase === "cooldown") {
      this.play([
        { freq: 520, dur: 0.16, type: "sine", gain: 0.5 },
        { freq: 392, dur: 0.26, type: "sine", gain: 0.5 },
      ]);
    } else {
      this.play([
        { freq: 440, dur: 0.16, type: "sine", gain: 0.5 },
        { freq: 330, dur: 0.24, type: "sine", gain: 0.5 },
      ]);
    }
  }

  finish() {
    this.play([
      { freq: 523, dur: 0.16, type: "triangle", gain: 0.5 },
      { freq: 659, dur: 0.16, type: "triangle", gain: 0.5 },
      { freq: 784, dur: 0.16, type: "triangle", gain: 0.5 },
      { freq: 1047, dur: 0.4, type: "triangle", gain: 0.55 },
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
