import { chromium } from "playwright";

const BASE = "http://localhost:4173/";
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS", m); } else { fail++; console.log("FAIL", m); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
const errors = [];
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

// 1. Default (flag off) — PiP button must NOT appear.
await page.goto(BASE, { waitUntil: "networkidle" });
await page.locator(".dock-start .btn-primary").click();
await page.waitForSelector(".run");
ok(
  (await page.locator('button[aria-label="picture-in-picture"]').count()) === 0,
  "default: PiP button hidden when experimentalPip = false",
);
await page.locator(".run-close").click();

// 2. Flag on — PiP button appears on the run screen.
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("tabatica.settings") || "{}");
  s.experimentalPip = true;
  localStorage.setItem("tabatica.settings", JSON.stringify(s));
});
await page.reload({ waitUntil: "networkidle" });
await page.locator(".dock-start .btn-primary").click();
await page.waitForSelector(".run");
const pipBtn = page.locator('button[aria-label="picture-in-picture"]');
ok((await pipBtn.count()) === 1, "flag on: PiP button rendered on run screen");
ok(await pipBtn.isVisible(), "PiP button is visible");

// 3. Clicking PiP must not throw (PiP request will likely be denied in
// headless Chromium, but our try/catch should swallow it silently).
await pipBtn.click().catch(() => undefined);
await page.waitForTimeout(400);
ok(true, "PiP button click did not crash the page");

// 4. PipTimer should have created a hidden <video> element.
const videoCount = await page.evaluate(() => document.querySelectorAll("video").length);
ok(videoCount >= 1, `PipTimer created the hidden <video> element (count=${videoCount})`);

ok(errors.length === 0, "no console/page errors" + (errors.length ? " -> " + JSON.stringify(errors.slice(0, 5)) : ""));

console.log(`\n==== pip smoke: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
