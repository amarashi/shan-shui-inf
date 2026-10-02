// Same seed, same painting. Different seed, different painting.
import { expect, test } from "vitest";
import { replay } from "./support/replay.js";

const SCROLLS = [1500, -3000, 800];
const world = (s) => replay(s, SCROLLS).MEM.chunks.map((c) => c.canv);

test("the same seed twice gives identical output", () => {
  const a = world("coast");
  world("something else in between");
  const b = world("coast");
  expect(b.length).toBe(a.length);
  expect(b).toEqual(a);
});

test("different seeds give different output", () => {
  expect(world("coast")).not.toEqual(world("sydney"));
});
