// Helpers for driving the untouched upstream page (upstream/index.html) in Chromium.
import { chromium } from "playwright";

export const UPSTREAM_URL = new URL("../../upstream/index.html", import.meta.url).href;

/** Launch headless Chromium. Call `browser.close()` when done. */
export function launch() {
  return chromium.launch();
}

/**
 * Open the upstream page with a seed. Every script on the page runs synchronously during
 * load, so when `goto` resolves the first screen and the paper texture are both done.
 * @param {import("playwright").Browser} browser
 * @param {string} seed raw seed string, passed as `?seed=` exactly as upstream reads it
 */
export async function openUpstream(browser, seed) {
  const page = await browser.newPage({ viewport: { width: 3200, height: 900 } });
  await page.goto(`${UPSTREAM_URL}?seed=${seed}`);
  return page;
}

/** Scroll the upstream view by `dx` world units through its own `xcroll`. */
export function xcroll(page, dx) {
  return page.evaluate((v) => xcroll(v), dx);
}

/** The SVG element currently on screen, as markup (what upstream's "Download as .SVG" saves). */
export function currentSvg(page) {
  return page.evaluate(() => document.getElementById("BG").innerHTML);
}

/** The paper texture tile upstream generated, as a PNG buffer. */
export async function paperPng(page) {
  const url = await page.evaluate(() => document.getElementById("bgcanv").toDataURL("image/png"));
  return Buffer.from(url.split(",")[1], "base64");
}
