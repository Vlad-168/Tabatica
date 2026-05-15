import { chromium } from "playwright";

const BASE = "http://localhost:4173/";
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS", m); } else { fail++; console.log("FAIL", m); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  serviceWorkers: "allow",
});

ctx.setDefaultTimeout(9000);
const errors = [];
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

// ---- 1. Load & render ----
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForSelector(".app", { timeout: 10000 });
ok(await page.locator(".brand").innerText().then(t => t.includes("Tabatica")), "app shell renders with brand");

// ---- 2. Default summary matches reference (10/40/20 x4 -> 03:50 / 8) ----
const nums = await page.locator(".summary .pill .num").allInnerTexts();
ok(nums[0] === "03:50", `header total = 03:50 (got ${nums[0]})`);
ok(nums[1] === "8", `header intervals = 8 (got ${nums[1]})`);

// ---- 3. START visible WITHOUT scrolling ----
const startBtn = page.locator(".dock-start .btn-primary");
ok(await startBtn.isVisible(), "START button is visible");
const inView = await startBtn.evaluate((el) => {
  const r = el.getBoundingClientRect();
  return r.top >= 0 && r.bottom <= window.innerHeight && r.width > 0;
});
ok(inView, "START is within the viewport without scrolling");
const scrollY0 = await page.evaluate(() => window.scrollY);
ok(scrollY0 === 0, "page is at top (no scroll needed to see START)");
// Scroll content to bottom; START must still be visible (fixed dock)
await page.locator(".content").evaluate((el) => el.scrollTo(0, el.scrollHeight)).catch(() => {});
await page.mouse.wheel(0, 2000);
await page.waitForTimeout(300);
ok(await startBtn.isVisible(), "START still visible after scrolling the config list");

// ---- 4. Stepper changes value + updates header ----
const workRow = page.locator(".row", { hasText: "Work" }).first();
await workRow.locator('button[aria-label="increase"]').click();
await page.waitForTimeout(150);
const workVal = await workRow.locator(".step-val").innerText();
ok(workVal === "00:45", `Work stepped 40 -> 00:45 (got ${workVal})`);
const totalAfter = (await page.locator(".summary .pill .num").allInnerTexts())[0];
// 4 work cycles, so +5s work => +20s total: 10 + 4*45 + 3*20 = 250 = 04:10
ok(totalAfter === "04:10", `header total recalculated to 04:10 (got ${totalAfter})`);

// ---- 5. Presets sheet + template apply ----
await page.locator(".btn-ghost", { hasText: "Presets" }).click();
await page.waitForSelector(".sheet", { timeout: 5000 });
ok(await page.locator(".sheet h3", { hasText: "Templates" }).isVisible(), "presets sheet opens with templates");
await page.locator(".preset-item", { hasText: "Classic Tabata" }).locator(".icon-btn.apply").click();
await page.waitForTimeout(400);
ok(await page.locator(".sheet").count() === 0, "sheet closes after applying template");
const numsT = await page.locator(".summary .pill .num").allInnerTexts();
ok(numsT[0] === "04:00" && numsT[1] === "16", `Classic Tabata applied (total ${numsT[0]}, intervals ${numsT[1]})`);

// ---- 6. Full workout run + history saved ----
const run = await ctx.newPage();
run.on("pageerror", (e) => errors.push("pageerror(run): " + e.message));
run.on("console", (m) => { if (m.type() === "error") errors.push("console(run): " + m.text()); });
await run.addInitScript(() => {
  localStorage.setItem("tabatica.config", JSON.stringify({
    prepare: 1, work: 1, rest: 0, cycles: 1, sets: 1,
    restBetweenSets: 0, cooldown: 0, workDescription: "", restDescription: "",
  }));
  localStorage.removeItem("tabatica.history");
});
await run.goto(BASE, { waitUntil: "networkidle" });
await run.locator(".dock-start .btn-primary").click();
ok(await run.waitForSelector(".run", { timeout: 5000 }).then(() => true), "run screen opens on START");
await run.waitForSelector(".phase-name", { timeout: 3000 });
const doneEl = await run.waitForSelector(".done-screen", { timeout: 9000 }).then(() => true).catch(() => false);
ok(doneEl, "workout reaches the completion screen");
ok(await run.locator(".done-screen", { hasText: "Workout Complete" }).isVisible(), "completion screen shows 'Workout Complete'");
const hist = await run.evaluate(() => JSON.parse(localStorage.getItem("tabatica.history") || "[]"));
ok(hist.length === 1 && hist[0].completed === true, `history saved 1 completed entry (got ${hist.length})`);
ok(hist[0].cycles === 1 && hist[0].totalSeconds === 2, "history entry has correct cycles/total");

// ---- 7. Run controls: pause/skip don't crash ----
const run2 = await ctx.newPage();
run2.on("pageerror", (e) => errors.push("pageerror(run2): " + e.message));
await run2.addInitScript(() => {
  localStorage.setItem("tabatica.config", JSON.stringify({
    prepare: 30, work: 30, rest: 15, cycles: 4, sets: 1,
    restBetweenSets: 0, cooldown: 0, workDescription: "", restDescription: "",
  }));
});
await run2.goto(BASE, { waitUntil: "networkidle" });
await run2.locator(".dock-start .btn-primary").click();
await run2.waitForSelector(".run .dial-time", { timeout: 5000 });
await run2.locator('.ctrl.main').click(); // pause
await run2.waitForTimeout(500);
const tPaused = await run2.locator(".dial-time").innerText();
await run2.waitForTimeout(800);
ok((await run2.locator(".dial-time").innerText()) === tPaused, "pause freezes the countdown");
await run2.locator('.ctrl.main').click(); // resume
await run2.locator('button[aria-label="skip"]').click(); // skip
await run2.waitForTimeout(300);
ok(await run2.locator(".phase-name").isVisible(), "skip advances without crashing");
await run2.locator('.run-close').click();
ok(await run2.locator(".run").count() === 0, "closing run returns to config");

// ---- 8. Close completion screen, then History tab shows it + stats ----
await run.bringToFront();
await run.locator(".done-screen .ctrl.main").click();
await run.waitForSelector(".run", { state: "detached", timeout: 5000 });
ok(await run.locator(".run").count() === 0, "completion screen closes back to config");
await run.locator(".tab", { hasText: "History" }).click();
await run.waitForSelector(".stat-grid", { timeout: 4000 });
const statN = (await run.locator(".stat .n").allInnerTexts())[0];
ok(statN === "1", `History stats show 1 workout (got ${statN})`);
ok(await run.locator(".hist-item").count() >= 1, "history list shows the entry");

// ---- 9. Settings persist ----
await run.locator(".tab", { hasText: "Settings" }).click();
await run.waitForSelector(".switch", { timeout: 4000 });
const sw = run.locator(".set-row", { hasText: "Sound effects" }).locator(".switch");
const before = await sw.getAttribute("class");
await sw.click();
await run.waitForTimeout(150);
const after = await sw.getAttribute("class");
ok(before !== after, "settings toggle flips");
const persisted = await run.evaluate(() => JSON.parse(localStorage.getItem("tabatica.settings") || "{}"));
ok(persisted.sound === false, "settings persisted to localStorage");

// ---- 10. PWA: manifest + iOS meta + service worker ----
const man = await page.evaluate(async () => {
  const r = await fetch("./manifest.webmanifest");
  return r.ok ? await r.json() : null;
});
ok(man && man.name && man.icons?.length >= 2, "manifest.webmanifest valid with icons");
const iosMeta = await page.locator('meta[name="apple-mobile-web-app-capable"]').count();
ok(iosMeta === 1, "iOS standalone meta tag present");
const appleIcon = await page.evaluate(async () => (await fetch("./icons/apple-touch-icon.png")).status);
ok(appleIcon === 200, "apple-touch-icon reachable");
const swReady = await page.evaluate(() =>
  navigator.serviceWorker
    ? Promise.race([
        navigator.serviceWorker.ready.then(() => true),
        new Promise((r) => setTimeout(() => r(false), 8000)),
      ])
    : Promise.resolve(false),
);
ok(swReady === true, "service worker registers (offline-capable PWA)");

// ---- 11. No uncaught errors anywhere ----
ok(errors.length === 0, "no console/page errors" + (errors.length ? " -> " + JSON.stringify(errors.slice(0, 6)) : ""));

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
