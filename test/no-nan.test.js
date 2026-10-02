// Geometry is valid: no NaN or Infinity anywhere in a display list. Upstream patched NaN
// out of the markup with -1000; that patch is gone, so this test is the guard.
import { expect, test } from "vitest";
import { replay } from "./support/replay.js";

const SEEDS = ["1", "42", "coast", "1759400000000", "1759400079190"];

function nonFinite(list) {
  for (const r of list) {
    const nums = r.type === "text" ? [r.x, r.y, r.size, r.rot] : [r.width, ...r.pts.flat()];
    for (const c of [r.fill, r.stroke]) if (c && c.a != null) nums.push(Number(c.a));
    if (nums.some((n) => !Number.isFinite(n))) return r;
  }
  return null;
}

test.each(SEEDS)("seed %s: every number in every chunk is finite", (s) => {
  const world = replay(s, [2500, -5000, 2500]);
  for (const c of world.MEM.chunks) {
    expect(nonFinite(c.list), `${c.tag} at x=${c.x}`).toBe(null);
    expect(c.canv).not.toContain("NaN");
  }
});
