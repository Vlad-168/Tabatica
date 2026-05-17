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
const page = await ctx.newPage();

// 1. First online visit — SW installs + precaches the whole shell.
await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(() => navigator.serviceWorker.ready);
// Wait until the precache cache actually holds the JS bundle.
const cached = await page.waitForFunction(async () => {
  const keys = await caches.keys();
  for (const k of keys) {
    const c = await caches.open(k);
    const reqs = await c.keys();
    if (reqs.some((r) => /assets\/index-.*\.js/.test(r.url))) return true;
  }
  return false;
}, null, { timeout: 10000 }).then(() => true).catch(() => false);
ok(cached, "service worker precached the JS bundle while online");

// 2. Go fully offline and reload — must NOT be a white screen.
await ctx.setOffline(true);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".app", { timeout: 8000 }).catch(() => {});
const rootFilled = await page.evaluate(() => {
  const r = document.getElementById("root");
  return !!r && r.children.length > 0;
});
ok(rootFilled, "OFFLINE reload renders the app (root not empty / no white screen)");
ok(await page.locator(".dock-start .btn-primary").isVisible(), "OFFLINE: START button visible");
ok(await page.locator(".summary .pill .num").first().isVisible(), "OFFLINE: header summary renders");

// 3. Reload again offline (simulates repeated flaky-network opens).
await page.reload({ waitUntil: "domcontentloaded" });
ok(await page.locator(".dock-start .btn-primary").isVisible({ timeout: 6000 }),
   "OFFLINE: second reload still works");

// 4. A workout can still run fully offline.
await ctx.addInitScript(() => {});
await page.evaluate(() => {
  localStorage.setItem("tabatica.config", JSON.stringify({
    prepare: 1, work: 1, rest: 0, cycles: 1, sets: 1,
    restBetweenSets: 0, cooldown: 0, workDescription: "", restDescription: "",
  }));
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.locator(".dock-start .btn-primary").click();
const done = await page.waitForSelector(".done-screen", { timeout: 8000 }).then(() => true).catch(() => false);
ok(done, "OFFLINE: a workout runs to completion");

console.log(`\n==== offline: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
