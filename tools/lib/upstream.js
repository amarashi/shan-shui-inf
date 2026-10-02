// Helpers for driving the untouched upstream page (upstream/index.html) in Chromium.
import { chromium } from "playwright";

export const UPSTREAM_URL = new URL("../../upstream/index.html", import.meta.url).href;

/** Launch headless Chromium. Call `browser.close()` when done. */
export function launch() {
  return chromium.launch();
}

/**
 * Open the upstream page (or the compatibility page, which exposes the same MEM and
 * xcroll globals) with a seed. All scripts on either page finish before the load event,
 * so when `goto` resolves the first screen and the paper texture are both done.
 * @param {import("playwright").Browser} browser
 * @param {string} seed raw seed string, passed as `?seed=` exactly as upstream reads it
 * @param {string} [url] page URL; defaults to upstream/index.html
 */
export async function openUpstream(browser, seed, url = UPSTREAM_URL) {
  const page = await browser.newPage({ viewport: { width: 3200, height: 900 } });
  await page.goto(`${url}?seed=${seed}`);
  return page;
}

/** Scroll the upstream view by `dx` world units through its own `xcroll`. */
export function xcroll(page, dx) {
  return page.evaluate((v) => xcroll(v), dx);
}

/**
 * PNG of the painting as a visitor sees it: the SVG multiplied over the paper texture.
 * Upstream's floating buttons are hidden with CSS first; generation is not affected.
 */
export async function screenshot(page) {
  await page.addStyleTag({ content: "#SETTING, #SOURCE_BTN { display: none !important; }" });
  return page.locator("#BG").screenshot();
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
