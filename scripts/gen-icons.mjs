// Rasterises public/icon.svg into the PNG sizes the PWA + iOS need.
// Runs automatically before `vite build` (see package.json).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcPath = resolve(root, "public/icon.svg");
const outDir = resolve(root, "public/icons");
const BRAND = { r: 99, g: 102, b: 241 }; // #6366f1

const svg = await readFile(srcPath);
await mkdir(outDir, { recursive: true });

async function write(name, buf) {
  await writeFile(resolve(outDir, name), buf);
  console.log("icon:", name);
}

// Transparent-corner icons (manifest "any" purpose).
for (const size of [192, 512]) {
  await write(
    `icon-${size}.png`,
    await sharp(svg, { density: 384 }).resize(size, size).png().toBuffer(),
  );
}

// Apple touch icon: opaque square, iOS applies its own corner rounding.
await write(
  "apple-touch-icon.png",
  await sharp(svg, { density: 384 })
    .resize(180, 180)
    .flatten({ background: BRAND })
    .png()
    .toBuffer(),
);

// Maskable: brand background full-bleed, artwork inside the safe zone.
const inner = Math.round(512 * 0.8);
const artwork = await sharp(svg, { density: 512 }).resize(inner, inner).png().toBuffer();
await write(
  "maskable-512.png",
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { ...BRAND, alpha: 1 },
    },
  })
    .composite([{ input: artwork, gravity: "center" }])
    .png()
    .toBuffer(),
);
