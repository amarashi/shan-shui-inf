// Contact sheet: render 8 fixed seeds and tile them into one PNG for review.
//
//   pnpm sheet                      upstream page, first screen
//   pnpm sheet --x 2000             scroll 2000 world units right first
//   pnpm sheet --source modules     the page on src/ (coast scene; --scene upstream for the old one)
//   pnpm sheet --source modules --palette roles   false colour by role (src/render/palette.js)
//
// Output: out/sheet-<source>.png
import { mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { tile } from "./lib/sheet.js";
import { startServer } from "./lib/server.js";
import { launch, openUpstream, screenshot, xcroll } from "./lib/upstream.js";

export const SHEET_SEEDS = ["1", "2", "3", "42", "coast", "sydney", "headland", "1234567890123"];

// Each source is a page that draws the upstream scene and exposes upstream's xcroll:
// upstream/index.html from disk, or the compatibility page (index.html on src/) via Vite.
const SOURCES = ["upstream", "modules"];

const { values } = parseArgs({
  options: {
    source: { type: "string", default: "upstream" },
    x: { type: "string", default: "0" },
    palette: { type: "string" },
    scene: { type: "string" }, // modules source only: coast (page default) or upstream
    out: { type: "string" },
  },
});
if (!SOURCES.includes(values.source)) {
  console.error(`unknown source "${values.source}"; available: ${SOURCES.join(", ")}`);
  process.exit(2);
}
const x = Number(values.x);

const server = values.source === "modules" ? await startServer() : null;
const url = server ? `${server.url}index.html` : undefined;
const browser = await launch();
const cells = [];
for (const seed of SHEET_SEEDS) {
  const t = Date.now();
  const query = [values.palette && `palette=${values.palette}`, values.scene && `scene=${values.scene}`].filter(Boolean).join("&");
  const page = await openUpstream(browser, seed, url, query);
  if (x) await xcroll(page, x);
  cells.push({ png: await screenshot(page), label: `seed ${seed}` });
  await page.close();
  console.log(`${seed.padEnd(14)} ${Date.now() - t} ms`);
}
await browser.close();
await server?.close();

const sheet = await tile(cells, {
  cols: 2,
  cellWidth: 1400,
  title: `contact sheet: ${values.source}${values.scene ? `, scene ${values.scene}` : ""}${values.palette ? `, palette ${values.palette}` : ""}, x = ${x}, ${new Date().toISOString().slice(0, 10)}`,
});
mkdirSync(new URL("../out/", import.meta.url), { recursive: true });
const out = values.out ?? `out/sheet-${values.source}${values.scene ? `-${values.scene}` : ""}${values.palette ? `-${values.palette}` : ""}${x ? `-x${x}` : ""}.png`;
writeFileSync(out, sheet);
console.log(`wrote ${out}`);
