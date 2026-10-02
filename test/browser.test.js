// The page in a real browser: after any scrolling, the SVG holds exactly the world's visible
// parts, in paint order (incremental DOM, Phase 2 step 6).
import { afterAll, beforeAll, expect, test } from "vitest";
import { startServer } from "../tools/lib/server.js";
import { launch, openUpstream } from "../tools/lib/upstream.js";

let server;
let browser;
beforeAll(async () => {
  server = await startServer();
  browser = await launch();
});
afterAll(async () => {
  await browser?.close();
  await server?.close();
});

test("the DOM matches the world's visible parts after every scroll", async () => {
  const page = await openUpstream(browser, "coast", `${server.url}index.html`);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const results = await page.evaluate(() => {
    const out = [];
    for (const dx of [0, 400, 400, -1200, 3000, -200, -5000]) {
      if (dx) xcroll(dx);
      const dom = [...document.querySelectorAll("#G > g")].map((g) => g.dataset.part);
      const want = world.visible().map((p) => p.id);
      out.push({ dom, want });
    }
    return out;
  });
  for (const { dom, want } of results) {
    expect(want.length).toBeGreaterThan(10);
    expect(dom).toEqual(want);
  }
  expect(errors).toEqual([]);
  await page.close();
});
