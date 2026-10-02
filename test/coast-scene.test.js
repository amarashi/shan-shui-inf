// The coast scene keeps the engine's guarantees: order independence, finite geometry, known
// roles, bounded memory with identical regeneration.
import { expect, test } from "vitest";
import { ROLES } from "../src/render/palette.js";
import { createWorld } from "../src/world/chunks.js";

const KS = [-3, -2, -1, 0, 1, 2, 3, 4];
const markup = (w, k) => w.chunk(k).map((p) => p.canv).join("\n");

test.each(["coast", "sydney"])("seed %s: chunks are identical in any generation order", (seed) => {
  const a = createWorld({ seed, scene: "coast" });
  const b = createWorld({ seed, scene: "coast" });
  for (const k of KS) a.chunk(k);
  for (const k of [...KS].reverse()) b.chunk(k);
  for (const k of KS) expect(markup(b, k), `chunk ${k}`).toBe(markup(a, k));
});

test("a view is the same however you scrolled there", () => {
  const direct = createWorld({ seed: "coast", scene: "coast" });
  direct.MEM.cursx = 1500;
  direct.update();
  const wander = createWorld({ seed: "coast", scene: "coast" });
  for (const dx of [-4000, 9000, -3500]) wander.xcroll(dx);
  expect(wander.MEM.canv).toBe(direct.MEM.canv);
});

test.each(["1", "42", "coast", "1234567890123"])("seed %s: finite geometry and known roles", (seed) => {
  const w = createWorld({ seed, scene: "coast" });
  for (const dx of [0, 3000, -6000]) {
    w.xcroll(dx);
    for (const p of w.visible()) {
      for (const r of p.list) {
        const nums = r.type === "text" ? [r.x, r.y, r.size, r.rot] : [r.width, ...r.pts.flat()];
        expect(nums.every(Number.isFinite), `${p.tag} at ${p.x}`).toBe(true);
        for (const c of r.type === "text" ? [r.fill] : [r.fill, r.stroke]) {
          expect(c.none || ROLES.includes(c.role), `${p.tag} role ${c.role}`).toBe(true);
        }
      }
    }
  }
});

test("memory stays bounded and evicted chunks come back identical", () => {
  const w = createWorld({ seed: "drift", scene: "coast" });
  w.update();
  const before = markup(w, 2);
  const sizes = [];
  for (let i = 0; i < 60; i++) {
    w.xcroll(500);
    sizes.push(w.cached());
  }
  expect(Math.max(...sizes)).toBeLessThanOrEqual(20);
  w.MEM.cursx = 0;
  w.update();
  expect(markup(w, 2)).toBe(before);
});
