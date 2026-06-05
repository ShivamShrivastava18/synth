/**
 * Records a fully-scripted walkthrough of the deployed Synth dashboard.
 * Target ~115 seconds so the TTS narration is covered by live visuals.
 *
 * Scenes:
 *   A. Linger on runs table (sparklines + status pulses)          ~ 7 s
 *   B. Select first run → detail panel                            ~ 4 s
 *   C. Slow scroll through metric cards (zoom on each)            ~ 22 s
 *   D. Slow scroll through histograms                             ~ 20 s
 *   E. Scroll to verdict region                                   ~ 6 s
 *   F. Scroll back to top + click second run for variety          ~ 12 s
 *   G. Scroll through that run's detail                           ~ 14 s
 *   H. Back to top, click "New run" → row appears                 ~ 18 s
 *   I. Hover and linger on the new pulsing row                    ~ 12 s
 *                                                                 ~115 s
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const URL = process.env.DASH_URL || "https://synth-dashboard-983648391385.us-central1.run.app/";
const OUT_DIR = path.resolve("./recordings");

async function smoothScroll(page, toY, durationMs = 1500) {
  await page.evaluate(async ({ toY, durationMs }) => {
    const fromY = window.scrollY;
    const start = performance.now();
    return await new Promise((resolve) => {
      function tick(now) {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        window.scrollTo(0, fromY + (toY - fromY) * eased);
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }, { toY, durationMs });
}

async function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();

  console.log("→ open", URL);
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector("table tbody tr", { timeout: 15000 });

  // ─── A. Linger on runs table ───────────────────────────────────────────
  await page.waitForTimeout(7000);

  // ─── B. Select first run ───────────────────────────────────────────────
  console.log("→ select first run");
  await page.locator("table tbody tr").first().click();
  await page.waitForTimeout(4000);

  // ─── C. Scroll through metrics ─────────────────────────────────────────
  console.log("→ scroll: metric cards");
  await smoothScroll(page, 380, 1800);
  await page.waitForTimeout(6500);
  await smoothScroll(page, 500, 1100);
  await page.waitForTimeout(6000);
  await smoothScroll(page, 600, 1100);
  await page.waitForTimeout(5500);

  // ─── D. Histograms ────────────────────────────────────────────────────
  console.log("→ scroll: histograms");
  await smoothScroll(page, 820, 1400);
  await page.waitForTimeout(5500);
  await smoothScroll(page, 980, 1100);
  await page.waitForTimeout(5500);
  await smoothScroll(page, 1100, 1100);
  await page.waitForTimeout(5000);

  // ─── E. Verdict area ───────────────────────────────────────────────────
  console.log("→ scroll: verdict");
  await smoothScroll(page, 1300, 900);
  await page.waitForTimeout(4500);

  // ─── F. Back to top, click second run ─────────────────────────────────
  console.log("→ scroll top, pick another run");
  await smoothScroll(page, 0, 1200);
  await page.waitForTimeout(3000);
  const rows = page.locator("table tbody tr");
  if ((await rows.count()) > 1) {
    await rows.nth(1).click();
    await page.waitForTimeout(3500);
  } else {
    await rows.first().click();
    await page.waitForTimeout(3500);
  }

  // ─── G. Scroll through that detail ────────────────────────────────────
  console.log("→ scroll: second run detail");
  await smoothScroll(page, 420, 1300);
  await page.waitForTimeout(5500);
  await smoothScroll(page, 820, 1300);
  await page.waitForTimeout(6500);

  // ─── H. Back to top, click "New run" ──────────────────────────────────
  console.log("→ scroll top, click New run");
  await smoothScroll(page, 0, 1100);
  await page.waitForTimeout(2200);
  const trigger = page.locator('button:has-text("New run")').first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await page.waitForTimeout(15000);

  // ─── I. Hover on new row, linger ──────────────────────────────────────
  console.log("→ hover new row");
  await page.locator("table tbody tr").first().hover();
  await page.waitForTimeout(11000);

  await context.close();
  await browser.close();

  const file = fs.readdirSync(OUT_DIR).find((f) => f.endsWith(".webm"));
  if (!file) {
    console.error("no .webm produced");
    process.exit(1);
  }
  const final = path.join(OUT_DIR, "dashboard.webm");
  fs.renameSync(path.join(OUT_DIR, file), final);
  console.log("✓ wrote", final);
}

main().catch((e) => { console.error(e); process.exit(1); });
