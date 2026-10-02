// The page in a real browser, generating in a Web Worker: after any scrolling, the SVG holds
// exactly the visible parts, in paint order (incremental DOM, Phase 2 steps 6 and 7).
import { createHash } from "node:crypto";
import { afterAll, beforeAll, expect, test } from "vitest";
import { createWorld } from "../src/world/chunks.js";
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
  const results = await page.evaluate(async () => {
    const out = [];
    for (const dx of [0, 400, 400, -1200, 3000, -200, -5000]) {
      if (dx) await xcroll(dx);
      const dom = [...document.querySelectorAll("#G > g")].map((g) => g.dataset.part);
      const want = scroller.visible().map((p) => p.id);
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

test("the worker generates exactly what Node generates", async () => {
  const page = await openUpstream(browser, "42", `${server.url}index.html`);
  const inPage = await page.evaluate(async () => {
    await xcroll(1700);
    const parts = scroller.visible();
    const bytes = new TextEncoder().encode(parts.map((p) => p.canv).join(""));
    const sha = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return { ids: parts.map((p) => p.id), sha };
  });
  await page.close();

  const world = createWorld({ seed: "42" });
  world.xcroll(1700);
  expect(inPage.ids).toEqual(world.visible().map((p) => p.id));
  expect(inPage.sha).toBe(createHash("sha256").update(world.MEM.canv).digest("hex"));
});
