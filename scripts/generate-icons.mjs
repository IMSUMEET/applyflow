import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const svgPath = resolve(root, "public/icon.svg");
const outDir = resolve(root, "public/icons");

mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);
const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(resolve(outDir, `${size}.png`));
  console.log(`✓ icons/${size}.png`);
}
console.log("Done.");
