// Embedding (PLAN.md Phase 6): mount(), <coast-inf>, accessibility, reduced motion, and
// renderToSVG() in Node.
import { afterAll, beforeAll, expect, test } from "vitest";
import { renderToSVG } from "../src/index.js";
import { startServer } from "../tools/lib/server.js";
import { launch } from "../tools/lib/upstream.js";

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

async function demo(query, contextOptions = {}) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, ...contextOptions });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${server.url}demo/index.html?${query}`);
  await page.evaluate(() => window.demo.scene.ready);
  return { page, context, errors };
}

test("two paintings on one page, each labelled for screen readers, with a pause control for drift", async () => {
  const { page, context, errors } = await demo("seed=coast&mode=drift");
  const info = await page.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 800));
    const hosts = [...document.querySelectorAll("#hero > div, coast-inf > div")];
    return hosts.map((h) => {
      const svg = h.shadowRoot.querySelector("svg");
      const btn = h.shadowRoot.querySelector("button");
      return { role: svg.getAttribute("role"), label: svg.getAttribute("aria-label"), parts: svg.querySelectorAll("g > g").length, pause: !btn.hidden };
    });
  });
  expect(info).toHaveLength(2);
  for (const p of info) {
    expect(p.role).toBe("img");
    expect(p.label).toMatch(/coastline/);
    expect(p.parts).toBeGreaterThan(20);
  }
  expect(info[0].pause).toBe(true); // drift
  expect(info[1].pause).toBe(false); // static
  expect(await page.evaluate(() => window.demo.scene.x)).toBeGreaterThan(0); // it drifts
  expect(errors).toEqual([]);
  await context.close();
});

test("no drift when the visitor prefers reduced motion", async () => {
  const { page, context } = await demo("seed=coast&mode=drift", { reducedMotion: "reduce" });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.demo.scene.x)).toBe(0);
  const pause = await page.evaluate(() => !document.querySelector("#hero > div").shadowRoot.querySelector("button").hidden);
  expect(pause).toBe(false);
  await context.close();
});

test("reseed paints a new painting; destroy removes everything", async () => {
  const { page, context } = await demo("seed=one&mode=static");
  const before = await page.evaluate(() => document.querySelector("#hero > div").shadowRoot.querySelector("g").innerHTML.length);
  await page.evaluate(() => window.demo.scene.reseed("two"));
  const after = await page.evaluate(() => ({ seed: window.demo.scene.seed, len: document.querySelector("#hero > div").shadowRoot.querySelector("g").innerHTML.length }));
  expect(after.seed).toBe("two");
  expect(after.len).not.toBe(before);
  await page.evaluate(() => window.demo.scene.destroy());
  expect(await page.evaluate(() => document.querySelector("#hero").children.length)).toBe(0);
  await context.close();
});

test("renderToSVG works in Node, without a DOM, and is deterministic", () => {
  const a = renderToSVG({ seed: "abc", x0: 0, x1: 1500 });
  const b = renderToSVG({ seed: "abc", x0: 0, x1: 1500 });
  expect(a).toBe(b);
  expect(a.startsWith("<svg")).toBe(true);
  expect(a).toContain('viewBox="0 0 1500 800"');
  expect(a).toContain('role="img"');
  expect(a).not.toContain("NaN");
});
