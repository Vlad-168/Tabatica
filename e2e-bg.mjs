import { chromium } from "playwright";

const BASE = "http://localhost:4173/";
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS", m); } else { fail++; console.log("FAIL", m); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on("pageerror", (e) => { fail++; console.log("FAIL pageerror:", e.message); });

// Segments: prepare5 | work5 | rest5 | work5 | rest5 | work5  (total 30s)
await page.addInitScript(() => {
  localStorage.setItem("tabatica.config", JSON.stringify({
    prepare: 5, work: 5, rest: 5, cycles: 3, sets: 1,
    restBetweenSets: 0, cooldown: 0, workDescription: "", restDescription: "",
  }));
  localStorage.removeItem("tabatica.history");
});
await page.clock.install();
await page.goto(BASE, { waitUntil: "networkidle" });
await page.locator(".dock-start .btn-primary").click();
await page.waitForSelector(".run .phase-name");

await page.clock.runFor(1000);
ok((await page.locator(".phase-name").innerText()).toLowerCase().includes("ready"), "at 1s: still in Prepare");

// Simulate the app being backgrounded/frozen for 12s, then returning.
// 0-5 prepare, 5-10 work, 10-15 rest -> at ~13s total we must be in Rest.
await page.clock.fastForward(12000);
await page.waitForTimeout(200);
const p1 = await page.locator(".phase-name").innerText();
ok(p1.toLowerCase() === "rest", `after 12s background jump -> Rest (got "${p1}")`);

// Schedule: 0-5 prep, 5-10 work, 10-15 rest, 15-20 work, 20-25 rest, 25-30 work
// +9s -> ~22s total -> second Rest (20-25)
await page.clock.fastForward(9000);
await page.waitForTimeout(200);
const p2 = await page.locator(".phase-name").innerText();
ok(p2.toLowerCase() === "rest", `after another 9s -> second Rest (got "${p2}")`);

// +5s -> ~27s total -> final Work (25-30)
await page.clock.fastForward(5000);
await page.waitForTimeout(200);
const p3 = await page.locator(".phase-name").innerText();
ok(p3.toLowerCase() === "work", `+5s more -> final Work (got "${p3}")`);

// Fast-forward beyond the end -> completion + history saved
await page.clock.fastForward(6000);
await page.waitForTimeout(300);
const done = await page.locator(".done-screen").count();
ok(done === 1, "backgrounding past the end still completes the workout");
const hist = await page.evaluate(() => JSON.parse(localStorage.getItem("tabatica.history") || "[]"));
ok(hist.length === 1 && hist[0].completed === true, "completed workout saved to history after catch-up");

console.log(`\n==== background self-correction: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
