import { chromium } from "playwright";

const BASE = "http://localhost:4173/";
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("PASS", m); } else { fail++; console.log("FAIL", m); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
page.on("pageerror", (e) => { fail++; console.log("FAIL pageerror:", e.message); });

// prepare5 | work5 | rest5 | work5 | rest5 | work5  (total 30s)
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

const phase = () => page.locator(".phase-name").innerText().then((s) => s.toLowerCase());

// Anchor on the app's own state rather than fixed offsets (robust to load timing).
await page.clock.runFor(1000);
ok((await phase()).includes("ready") || (await phase()) === "work", "early on: in an opening phase");

// Simulate the app frozen in the background, then returning mid-workout.
await page.clock.fastForward(12000);
await page.waitForTimeout(150);
const mid = await phase();
ok(["work", "rest"].includes(mid), `after 12s background jump it resynced to a live phase (got "${mid}")`);
ok(mid !== "get ready", "no longer stuck on the opening phase (it caught up)");

// Background past the end -> must complete and persist, not stall.
await page.clock.fastForward(30000);
await page.waitForTimeout(300);
ok(await page.locator(".done-screen").count() === 1, "backgrounding past the end still completes the workout");
const hist = await page.evaluate(() => JSON.parse(localStorage.getItem("tabatica.history") || "[]"));
ok(hist.length === 1 && hist[0].completed === true, "completed workout saved to history after catch-up");

console.log(`\n==== background self-correction: ${pass} passed, ${fail} failed ====`);
await browser.close();
process.exit(fail ? 1 : 0);
