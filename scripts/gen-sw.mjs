// Runs after `vite build`: scans dist/ and bakes the full app-shell file
// list + a content-derived cache version into dist/sw.js, so the service
// worker precaches everything and the app opens offline reliably.
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");

async function walk(dir, base = "") {
  const out = [];
  for (const entry of await readdir(resolve(dist, dir || "."), { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await walk(rel, rel)));
    else out.push(rel);
  }
  return out;
}

const all = await walk("");
const assets = all
  .filter((f) => f !== "sw.js" && !f.endsWith(".map"))
  .map((f) => "./" + f);
// Ensure the navigation roots are present even though "./" isn't a real file.
const precache = Array.from(new Set(["./", "./index.html", ...assets]));

const version = createHash("sha256")
  .update(precache.sort().join("|") + (await readFile(resolve(dist, "index.html"), "utf8")))
  .digest("hex")
  .slice(0, 12);

const swPath = resolve(dist, "sw.js");
let sw = await readFile(swPath, "utf8");
sw = sw
  .replace(/const VERSION = "dev"; \/\/ build:version/, `const VERSION = "${version}";`)
  .replace(
    /const ASSETS = \[[^\]]*\]; \/\/ build:assets/,
    `const ASSETS = ${JSON.stringify(precache)};`,
  );
await writeFile(swPath, sw);
console.log(`sw.js: cached ${precache.length} entries, version ${version}`);
