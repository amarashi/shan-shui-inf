// Contact sheet: render 8 fixed seeds and tile them into one PNG for review.
//
//   pnpm sheet                      upstream page, first screen
//   pnpm sheet -- --x 2000          scroll 2000 world units right first
//   pnpm sheet -- --source upstream
//
// Output: out/sheet-<source>.png
import { mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { tile } from "./lib/sheet.js";
import { launch, openUpstream, screenshot, xcroll } from "./lib/upstream.js";

export const SHEET_SEEDS = ["1", "2", "3", "42", "coast", "sydney", "headland", "1234567890123"];

// Each source turns (browser, seed, x) into a PNG. Phase 1 adds the module build here.
const SOURCES = {
  async upstream(browser, seed, x) {
    const page = await openUpstream(browser, seed);
    if (x) await xcroll(page, x);
    const png = await screenshot(page);
    await page.close();
    return png;
  },
};

const { values } = parseArgs({
  options: {
    source: { type: "string", default: "upstream" },
    x: { type: "string", default: "0" },
    out: { type: "string" },
  },
});
const render = SOURCES[values.source];
if (!render) {
  console.error(`unknown source "${values.source}"; available: ${Object.keys(SOURCES).join(", ")}`);
  process.exit(2);
}
const x = Number(values.x);

const browser = await launch();
const cells = [];
for (const seed of SHEET_SEEDS) {
  const t = Date.now();
  cells.push({ png: await render(browser, seed, x), label: `seed ${seed}` });
  console.log(`${seed.padEnd(14)} ${Date.now() - t} ms`);
}
await browser.close();

const sheet = await tile(cells, {
  cols: 2,
  cellWidth: 1400,
  title: `contact sheet: ${values.source}, x = ${x}, ${new Date().toISOString().slice(0, 10)}`,
});
mkdirSync(new URL("../out/", import.meta.url), { recursive: true });
const out = values.out ?? `out/sheet-${values.source}${x ? `-x${x}` : ""}.png`;
writeFileSync(out, sheet);
console.log(`wrote ${out}`);
