// The world does not depend on the order chunks were generated in (PLAN.md fact 5).
import { expect, test } from "vitest";
import { createWorld } from "../src/world/chunks.js";

const KS = [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
const ORDERS = {
  "left to right": KS,
  "right to left": [...KS].reverse(),
  shuffled: [3, -2, 5, 0, -4, 1, 4, -1, 2, -3],
};

const markup = (w, k) => w.chunk(k).map((p) => p.canv).join("\n");

test.each(["coast", "42"])("seed %s: every chunk is identical in three generation orders", (seed) => {
  const worlds = Object.values(ORDERS).map((order) => {
    const w = createWorld({ seed });
    for (const k of order) w.chunk(k);
    return w;
  });
  for (const k of KS) {
    const ref = markup(worlds[0], k);
    expect(ref.length, `chunk ${k}`).toBeGreaterThan(0);
    for (const w of worlds.slice(1)) expect(markup(w, k), `chunk ${k}`).toBe(ref);
  }
});

test("the view at one position is the same however you scrolled there", () => {
  const direct = createWorld({ seed: "coast" });
  direct.MEM.cursx = 1200;
  direct.update();

  const wandering = createWorld({ seed: "coast" });
  for (const dx of [-3000, 2000, 5000, -2800]) wandering.xcroll(dx);
  expect(wandering.MEM.cursx).toBe(1200);

  expect(wandering.MEM.canv.length).toBeGreaterThan(100000);
  expect(wandering.MEM.canv).toBe(direct.MEM.canv);
});
