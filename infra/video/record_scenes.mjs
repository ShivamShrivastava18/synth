/**
 * Record each static HTML scene as a separate webm.
 * Scene durations are tuned to their CSS animation timelines.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const SCENES = {
  architecture: 25,
  terminal:     16,
  fivetran:     14,
  bigquery:     10,
};

const ROOT = path.resolve(".");
const OUT_BASE = path.join(ROOT, "recordings");
fs.mkdirSync(OUT_BASE, { recursive: true });

async function main() {
  for (const [scene, durSec] of Object.entries(SCENES)) {
    const outDir = path.join(OUT_BASE, `scene_${scene}`);
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      recordVideo: { dir: outDir, size: { width: 1920, height: 1080 } },
    });
    const page = await ctx.newPage();
    const file = "file://" + path.join(ROOT, `${scene}.html`);
    console.log(`→ ${scene}  (${durSec}s)`);
    await page.goto(file);
    await page.waitForTimeout(durSec * 1000);
    await ctx.close();
    await browser.close();

    const webm = fs.readdirSync(outDir).find((f) => f.endsWith(".webm"));
    if (!webm) throw new Error(`no webm for ${scene}`);
    const finalPath = path.join(OUT_BASE, `${scene}.webm`);
    fs.renameSync(path.join(outDir, webm), finalPath);
    fs.rmdirSync(outDir);
    console.log(`  wrote ${finalPath}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
