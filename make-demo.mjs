import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import ffmpeg from "ffmpeg-static";

const BASE = "http://localhost:4173/";
const REC = "/tmp/rec";
const OUT = "/home/user/Tabatica/tabatica-demo.mp4";

// Seed a believable recent history (for stats + streak) using REAL now.
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

// ---- caption overlay toolkit (rendered into the recording) ----
await page.addStyleTag({
  content: `
  html{zoom:2}
  body{background:linear-gradient(160deg,#5b5bf0,#3b2f9e)!important}
  #cap{position:fixed;left:0;right:0;bottom:64px;z-index:99999;display:flex;
    justify-content:center;pointer-events:none;padding:0 16px}
  #cap .b{font:800 16px/1.25 -apple-system,system-ui,sans-serif;color:#fff;
    text-align:center;background:linear-gradient(135deg,#5b5bf0,#4338ca);
    padding:9px 15px;border-radius:13px;box-shadow:0 10px 24px -8px rgba(20,20,70,.7);
    opacity:0;transform:translateY(10px);transition:all .35s cubic-bezier(.22,1,.36,1);
    max-width:92%}
  #cap.show .b{opacity:1;transform:translateY(0)}
  #endcard{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:10px;pointer-events:none;
    background:linear-gradient(160deg,#5b5bf0,#3b2f9e);opacity:0;transition:opacity .5s}
  #endcard.show{opacity:1}
  #endcard h1{font:900 40px/1 -apple-system,system-ui,sans-serif;color:#fff;margin:0;letter-spacing:-.02em}
  #endcard p{font:700 16px/1.35 -apple-system,system-ui,sans-serif;color:#dfe1ff;margin:0;text-align:center}
  #endcard .u{font:700 14px/1 -apple-system,system-ui,sans-serif;color:#fff;
    background:rgba(255,255,255,.16);padding:8px 13px;border-radius:9px;margin-top:5px}`,
});
await page.evaluate(() => {
  const c = document.createElement("div");
  c.id = "cap";
  c.innerHTML = '<div class="b"></div>';
  document.body.appendChild(c);
  const e = document.createElement("div");
  e.id = "endcard";
  e.innerHTML =
    '<h1>Tabatica</h1><p>Free Tabata / HIIT timer<br>Works offline · No App Store</p>' +
    '<div class="u">Add to Home Screen → train</div>';
  document.body.appendChild(e);
  window.__cap = (t) => {
    const cap = document.getElementById("cap");
    if (!t) { cap.classList.remove("show"); return; }
    cap.querySelector(".b").textContent = t;
    cap.classList.add("show");
  };
  window.__end = () => document.getElementById("endcard").classList.add("show");
});
const cap = (t) => page.evaluate((x) => window.__cap(x), t);
const wait = (ms) => page.waitForTimeout(ms);

// ---- Scene 1: the config screen ----
await cap("Your Tabata timer — upgraded");
await wait(2200);
await page.locator(".row", { hasText: "Work" }).first().locator('button[aria-label="increase"]').click();
await wait(500);
await page.locator(".row", { hasText: "Cycles" }).first().locator('button[aria-label="increase"]').click();
await wait(900);
await cap("Set work · rest · cycles · sets");
await wait(2400);

// ---- Scene 2: presets ----
await page.locator(".btn-ghost", { hasText: "Presets" }).click();
await page.waitForSelector(".sheet");
await cap("Save presets & templates");
await wait(2400);
await page.locator(".preset-item", { hasText: "HIIT 40/20" }).locator(".icon-btn.apply").click();
await wait(1200);

// ---- Scene 3 + 4: run screen with phase colour changes ----
await page.locator(".dock-start .btn-primary").click();
await page.waitForSelector(".run .dial-time");
await cap("Big full-screen timer");
for (let i = 0; i < 10; i++) {
  await page.clock.fastForward(5000);
  await wait(420);
}
await cap("Voice & beep cues every phase");
for (let i = 0; i < 8; i++) {
  await page.clock.fastForward(6000);
  await wait(420);
}

// ---- Scene 5: completion ----
await page.clock.fastForward(900000);
await page.waitForSelector(".done-screen", { timeout: 5000 }).catch(() => {});
await cap("Every workout tracked");
await wait(2600);
await page.locator(".done-screen .ctrl.main").click().catch(() => {});
await page.waitForSelector(".run", { state: "detached" }).catch(() => {});

// ---- Scene 6: history + streak ----
await page.locator(".tab", { hasText: "History" }).click();
await page.waitForSelector(".stat-grid");
await cap("Stats & streaks");
await wait(1600);
await page.mouse.wheel(0, 420);
await wait(2200);

// ---- Scene 7: settings ----
await page.locator(".tab", { hasText: "Settings" }).click();
await page.waitForSelector(".switch");
await cap("Works offline · installs like an app");
await wait(2600);

// ---- Scene 8: end card ----
await cap("");
await page.evaluate(() => window.__end());
await wait(3200);

await page.close();
await ctx.close();
await browser.close();

// ---- transcode webm -> Instagram-ready mp4 ----
const webm = REC + "/" + readdirSync(REC).find((f) => f.endsWith(".webm"));
execFileSync(
  ffmpeg,
  [
    "-y", "-i", webm,
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p,fps=30",
    "-c:v", "libx264", "-profile:v", "high", "-preset", "veryfast", "-crf", "20",
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
