import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import ffmpeg from "ffmpeg-static";

const BASE = "http://localhost:4173/";
const REC = "/tmp/rec";
const OUT = "/home/user/Tabatica/tabatica-demo.mp4";

const now = Date.now();
const DAY = 86400000;
const history = [
  { d: 0, work: 240, total: 320, c: 8 },
  { d: 0, work: 180, total: 240, c: 6 },
  { d: 1, work: 240, total: 320, c: 8 },
  { d: 2, work: 300, total: 380, c: 10 },
  { d: 3, work: 200, total: 260, c: 6 },
  { d: 4, work: 240, total: 320, c: 8 },
].map((e, i) => ({
  id: "seed" + i,
  name: i % 2 ? "HIIT 40/20" : "Classic Tabata",
  date: now - e.d * DAY - i * 3600000,
  totalSeconds: e.total,
  activeSeconds: e.total - 20,
  workSeconds: e.work,
  cycles: e.c,
  sets: 1,
  completed: true,
}));

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
  serviceWorkers: "block",
  recordVideo: { dir: REC, size: { width: 1080, height: 1920 } },
});
const page = await ctx.newPage();

await page.addInitScript((hist) => {
  localStorage.setItem(
    "tabatica.config",
    JSON.stringify({
      prepare: 10, work: 40, rest: 20, cycles: 8, sets: 1,
      restBetweenSets: 0, cooldown: 0, workDescription: "", restDescription: "",
    }),
  );
  localStorage.setItem("tabatica.history", JSON.stringify(hist));
  localStorage.setItem(
    "tabatica.settings",
    JSON.stringify({ sound: true, voice: false, volume: 1, countdownBeeps: true, keepAwake: true, theme: "system" }),
  );
}, history);

await page.clock.install();
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForSelector(".app");

await page.addStyleTag({
  content: `
  html{zoom:2}
  body{background:linear-gradient(160deg,#5b5bf0,#3b2f9e)!important}
  .app{animation:appin .7s cubic-bezier(.22,1,.36,1) both}
  @keyframes appin{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:none}}
  #cap{position:fixed;left:0;right:0;bottom:64px;z-index:99999;display:flex;
    justify-content:center;pointer-events:none;padding:0 16px}
  #cap .b{font:800 16px/1.25 -apple-system,system-ui,sans-serif;color:#171933;
    text-align:center;background:#fff;border:1px solid rgba(0,0,0,.06);
    padding:10px 16px;border-radius:13px;box-shadow:0 12px 30px -8px rgba(0,0,0,.5);
    opacity:0;transform:translateY(14px) scale(.94);
    transition:opacity .42s ease,transform .42s cubic-bezier(.22,1,.36,1);max-width:92%}
  #cap.show .b{opacity:1;transform:none}
  #fx{position:fixed;inset:0;z-index:99998;pointer-events:none;opacity:0;
    background:linear-gradient(160deg,#6366f1,#3b2f9e);
    transition:opacity .34s ease}
  #fx.on{opacity:1}
  #endcard{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:10px;pointer-events:none;
    background:linear-gradient(160deg,#5b5bf0,#3b2f9e);opacity:0;transition:opacity .6s ease}
  #endcard.show{opacity:1}
  #endcard>*{opacity:0;transform:translateY(16px);transition:all .6s cubic-bezier(.22,1,.36,1)}
  #endcard.show>*{opacity:1;transform:none}
  #endcard.show h1{transition-delay:.15s}
  #endcard.show p{transition-delay:.3s}
  #endcard.show .u{transition-delay:.45s}
  #endcard.show .cr{transition-delay:.62s}
  #endcard h1{font:900 40px/1 -apple-system,system-ui,sans-serif;color:#fff;margin:0;letter-spacing:-.02em}
  #endcard p{font:700 16px/1.35 -apple-system,system-ui,sans-serif;color:#dfe1ff;margin:0;text-align:center}
  #endcard .u{font:700 14px/1 -apple-system,system-ui,sans-serif;color:#fff;
    background:rgba(255,255,255,.16);padding:8px 13px;border-radius:9px;margin-top:5px}
  #endcard .cr{font:600 12px/1 -apple-system,system-ui,sans-serif;
    color:rgba(255,255,255,.78);margin-top:16px;letter-spacing:.02em}`,
});
await page.evaluate(() => {
  const mk = (id, html) => {
    const d = document.createElement("div");
    d.id = id;
    if (html) d.innerHTML = html;
    document.body.appendChild(d);
    return d;
  };
  mk("cap", '<div class="b"></div>');
  mk("fx", "");
  mk(
    "endcard",
    '<h1>Tabatica</h1><p>Free Tabata / HIIT timer<br>Works offline · No App Store</p>' +
      '<div class="u">Add to Home Screen → train</div>' +
      '<div class="cr">Developed by Vladislav Groshkov</div>',
  );
  window.__cap = (t) => {
    const c = document.getElementById("cap");
    if (!t) { c.classList.remove("show"); return; }
    c.querySelector(".b").textContent = t;
    c.classList.add("show");
  };
  window.__capHide = () => document.getElementById("cap").classList.remove("show");
  window.__fx = (on) => document.getElementById("fx").classList.toggle("on", on);
  window.__end = () => document.getElementById("endcard").classList.add("show");
  window.__scroll = (px, ms) =>
    new Promise((res) => {
      const el =
        document.querySelector(".content") && document.querySelector(".content").scrollHeight >
          document.querySelector(".content").clientHeight
          ? document.querySelector(".content")
          : document.scrollingElement || document.documentElement;
      const s = el.scrollTop;
      const t0 = performance.now();
      const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
      const step = (t) => {
        const k = Math.min(1, (t - t0) / ms);
        el.scrollTop = s + px * ease(k);
        k < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
});

const wait = (ms) => page.waitForTimeout(ms);
// Animated caption: ease the old one out, then bring the new one in.
const cap = async (t) => {
  await page.evaluate(() => window.__capHide());
  await wait(260);
  await page.evaluate((x) => window.__cap(x), t);
};
// Cross-fade transition that hides a screen swap behind a gradient panel.
const wipe = async (fn) => {
  await page.evaluate(() => window.__capHide());
  await page.evaluate(() => window.__fx(true));
  await wait(360);
  await fn();
  await wait(260);
  await page.evaluate(() => window.__fx(false));
  await wait(360);
};

// ---- Scene 1: config ----
await wait(550);
await cap("Your Tabata timer — upgraded");
await wait(2000);
await page.locator(".row", { hasText: "Work" }).first().locator('button[aria-label="increase"]').click();
await wait(550);
await page.locator(".row", { hasText: "Cycles" }).first().locator('button[aria-label="increase"]').click();
await wait(800);
await cap("Set work · rest · cycles · sets");
await wait(2200);

// ---- Scene 2: presets ----
await page.locator(".btn-ghost", { hasText: "Presets" }).click();
await page.waitForSelector(".sheet");
await cap("Save presets & templates");
await wait(2200);
await page.locator(".preset-item", { hasText: "HIIT 40/20" }).locator(".icon-btn.apply").click();
await wait(1100);

// ---- Scene 3 + 4: run with smooth ticking ----
await wipe(async () => {
  await page.locator(".dock-start .btn-primary").click();
  await page.waitForSelector(".run .dial-time");
});
await cap("Big full-screen timer");
for (let i = 0; i < 26; i++) {
  await page.clock.fastForward(1700);
  await wait(150);
}
await cap("Voice & beep cues every phase");
for (let i = 0; i < 22; i++) {
  await page.clock.fastForward(2200);
  await wait(150);
}

// ---- Scene 5: completion ----
await page.clock.fastForward(900000);
await page.waitForSelector(".done-screen", { timeout: 5000 }).catch(() => {});
await cap("Every workout tracked");
await wait(2600);

// ---- Scene 6: history + streak ----
await wipe(async () => {
  await page.locator(".done-screen .ctrl.main").click().catch(() => {});
  await page.waitForSelector(".run", { state: "detached" }).catch(() => {});
  await page.locator(".tab", { hasText: "History" }).click();
  await page.waitForSelector(".stat-grid");
});
await cap("Stats & streaks");
await wait(1500);
await page.evaluate(() => window.__scroll(360, 1400));
await wait(2000);

// ---- Scene 7: settings & capabilities ----
await wipe(async () => {
  await page.locator(".tab", { hasText: "Settings" }).click();
  await page.waitForSelector(".switch");
});
await cap("Make it yours");
await wait(1700);
await page.locator(".set-row", { hasText: "Voice cues" }).locator(".switch").click();
await wait(700);
await cap("Sound · voice · countdown beeps");
await wait(2000);
await page.evaluate(() => window.__scroll(320, 1300));
await wait(1300);
await cap("Keep screen awake · Apple Health export");
await wait(2400);
await page.locator(".seg button", { hasText: "Dark" }).click();
await wait(900);
await cap("Light & dark themes");
await wait(900);
await page.evaluate(() => window.__scroll(-260, 1100));
await wait(1500);
await cap("Works offline · installs like an app");
await wait(2200);

// ---- Scene 8: end card ----
await page.evaluate(() => window.__capHide());
await wait(200);
await page.evaluate(() => window.__end());
await wait(3400);

await page.close();
await ctx.close();
await browser.close();

const webm = REC + "/" + readdirSync(REC).find((f) => f.endsWith(".webm"));
execFileSync(
  ffmpeg,
  [
    "-y", "-i", webm,
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-vf",
    "scale=1080:1920:force_original_aspect_ratio=decrease," +
      "pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p," +
      "minterpolate=fps=60:mi_mode=blend",
    "-c:v", "libx264", "-profile:v", "high", "-preset", "veryfast", "-crf", "20",
    "-r", "60",
    "-c:a", "aac", "-b:a", "128k", "-shortest",
    "-movflags", "+faststart",
    OUT,
  ],
  { stdio: "ignore" },
);
let info = "";
try {
  execFileSync(ffmpeg, ["-i", OUT], { stdio: ["ignore", "ignore", "pipe"] });
} catch (e) {
  info = String(e.stderr || "");
}
const m = info.match(/Duration: [^,]+/);
console.log("DEMO_DONE", OUT, m ? m[0] : "");
