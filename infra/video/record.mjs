/**
 * Records a scripted walkthrough of the deployed dashboard.
 * Target ~55 seconds — the rest of the video is covered by separate
 * scene HTMLs (architecture, terminal, Fivetran, BigQuery, end card).
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const URL = process.env.DASH_URL || "https://synth-dashboard-983648391385.us-central1.run.app/";
const OUT_DIR = path.resolve("./recordings");

async function smoothScroll(page, toY, durationMs = 1300) {
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
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const TMP_DIR = path.join(OUT_DIR, "_dashboard_tmp");
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const finalPath = path.join(OUT_DIR, "dashboard.webm");
  if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: TMP_DIR, size: { width: 1920, height: 1080 } },
  });
  const page = await context.newPage();

  console.log("→ open", URL);
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector("table tbody tr", { timeout: 15000 });

  // Linger on runs table (4s)
  await page.waitForTimeout(4000);

  // Select first run (2s + open)
  console.log("→ select first run");
  await page.locator("table tbody tr").first().click();
  await page.waitForTimeout(2500);

  // Scroll to metric cards (10s linger)
  console.log("→ scroll to metrics");
  await smoothScroll(page, 380, 1200);
  await page.waitForTimeout(9000);

  // Scroll to histograms (10s linger)
  console.log("→ scroll to histograms");
  await smoothScroll(page, 820, 1300);
  await page.waitForTimeout(9000);

  // Quick peek at verdict (2s)
  console.log("→ scroll to verdict");
  await smoothScroll(page, 1200, 900);
  await page.waitForTimeout(2200);

  // Back to top, click New run (10s wait so the row appears)
  console.log("→ scroll top, click New run");
  await smoothScroll(page, 0, 1100);
  await page.waitForTimeout(1800);
  const trigger = page.locator('button:has-text("New run")').first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await page.waitForTimeout(10000);

  // Hover the new row briefly
  console.log("→ hover new row");
  await page.locator("table tbody tr").first().hover();
  await page.waitForTimeout(3500);

  await context.close();
  await browser.close();

  const file = fs.readdirSync(TMP_DIR).find((f) => f.endsWith(".webm"));
  if (!file) {
    console.error("no .webm produced");
    process.exit(1);
  }
  fs.renameSync(path.join(TMP_DIR, file), finalPath);
  fs.rmdirSync(TMP_DIR);
  console.log("✓ wrote", finalPath);
}

main().catch((e) => { console.error(e); process.exit(1); });
