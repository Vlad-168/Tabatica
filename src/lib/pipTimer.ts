// Picture-in-Picture timer. iOS Safari has no Document PiP API, but it does
// support video PiP via the webkit-prefixed presentation-mode API. We render
// the timer onto an offscreen canvas, expose the canvas as a MediaStream
// through a hidden <video>, and push the video into PiP from a user gesture.
type PipState = {
  phase: "prepare" | "work" | "rest" | "restset" | "cooldown" | "done" | string;
  phaseLabel: string;
  timeText: string;
  meta: string;
};

const W = 640;
const H = 640;

const PHASE_GRAD: Record<string, [string, string]> = {
  prepare: ["#f59e0b", "#d97706"],
  work: ["#6366f1", "#4338ca"],
  rest: ["#14b8a6", "#0d9488"],
  restset: ["#0ea5e9", "#0369a1"],
  cooldown: ["#8b5cf6", "#6d28d9"],
  done: ["#22c55e", "#15803d"],
};

type WebkitVideo = HTMLVideoElement & {
  webkitSupportsPresentationMode?: (mode: string) => boolean;
  webkitSetPresentationMode?: (mode: string) => void;
  webkitPresentationMode?: string;
};

export class PipTimer {
  static supported(): boolean {
    if (typeof document === "undefined" || typeof HTMLVideoElement === "undefined") return false;
    // iOS Safari: presence of the webkit presentation-mode API on the
    // HTMLVideoElement prototype is the most reliable signal (calling it
    // on a sourceless element can return false even when PiP is available).
    if ("webkitSupportsPresentationMode" in HTMLVideoElement.prototype) return true;
    // Standard PiP API (Chrome, desktop Safari, modern Edge).
    return document.pictureInPictureEnabled === true;
  }

  onClose?: () => void;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private video: WebkitVideo;
  private raf: number | null = null;
  private state: PipState = {
    phase: "work",
    phaseLabel: "READY",
    timeText: "00:00",
    meta: "",
  };

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext("2d", { alpha: false })!;
    this.draw();

    this.video = document.createElement("video") as WebkitVideo;
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.setAttribute("muted", "");
    this.video.setAttribute("playsinline", "");
    this.video.style.cssText =
      "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1";
    document.body.appendChild(this.video);

    const stream = (this.canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream })
      .captureStream(30);
    this.video.srcObject = stream;

    this.video.addEventListener("leavepictureinpicture", () => this.onClose?.());
    this.video.addEventListener("webkitpresentationmodechanged", () => {
      if (this.video.webkitPresentationMode !== "picture-in-picture") this.onClose?.();
    });
  }

  update(s: Partial<PipState>) {
    Object.assign(this.state, s);
  }

  async enter() {
    try {
      await this.video.play();
    } catch {
      /* autoplay block on first attempt — PiP request below also requires gesture */
    }
    this.startLoop();
    if (typeof this.video.webkitSetPresentationMode === "function") {
      this.video.webkitSetPresentationMode("picture-in-picture");
    } else if ("requestPictureInPicture" in this.video) {
      await this.video.requestPictureInPicture();
    } else {
      throw new Error("Picture-in-Picture not supported");
    }
  }

  async exit() {
    this.stopLoop();
    try {
      if (
        typeof this.video.webkitSetPresentationMode === "function" &&
        this.video.webkitPresentationMode === "picture-in-picture"
      ) {
        this.video.webkitSetPresentationMode("inline");
      } else if (document.pictureInPictureElement === this.video) {
        await document.exitPictureInPicture();
      }
    } catch {
      /* already exited */
    }
  }

  destroy() {
    this.stopLoop();
    void this.exit();
    try {
      this.video.pause();
      this.video.srcObject = null;
    } catch {
      /* ignore */
    }
    this.video.remove();
  }

  private startLoop() {
    if (this.raf != null) return;
    const loop = () => {
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stopLoop() {
    if (this.raf != null) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  private draw() {
    const ctx = this.ctx;
    const { phase, phaseLabel, timeText, meta } = this.state;
    const [c1, c2] = PHASE_GRAD[phase] ?? PHASE_GRAD.work;

    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    ctx.font = "bold 64px -apple-system, system-ui, sans-serif";
    ctx.fillText(phaseLabel, W / 2, 120);

    ctx.font = "900 220px -apple-system, system-ui, sans-serif";
    ctx.fillText(timeText, W / 2, H / 2 + 80);

    if (meta) {
      ctx.font = "bold 44px -apple-system, system-ui, sans-serif";
      ctx.globalAlpha = 0.92;
      ctx.fillText(meta, W / 2, H - 100);
      ctx.globalAlpha = 1;
    }
  }
}
