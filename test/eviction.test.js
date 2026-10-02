// Memory stays bounded during a long scroll, and evicted chunks come back identical.
import { expect, test } from "vitest";
import { createWorld } from "../src/world/chunks.js";

test("a long auto-scroll keeps a bounded number of chunks", () => {
  const world = createWorld({ seed: "drift" });
  world.update();
  const sizes = [];
  for (let i = 0; i < 200; i++) {
    world.xcroll(400); // 80,000 units in total
    sizes.push(world.cached());
  }
  // the view (3000) plus margins spans about 15 chunks of 512; never more than 20
  expect(Math.max(...sizes)).toBeLessThanOrEqual(20);
  expect(world.MEM.chunks.length).toBeLessThan(400);
});

test("an evicted chunk regenerates identically", () => {
  const world = createWorld({ seed: "drift" });
  world.update();
  const before = world.chunk(1).map((p) => p.canv).join("\n");
  world.xcroll(20000); // chunk 1 is evicted
  world.xcroll(-20000); // and comes back
  const after = world.chunk(1).map((p) => p.canv).join("\n");
  expect(after).toBe(before);
});
