// Coast model invariants (PLAN.md 3.1).
import { expect, test } from "vitest";
import { createCoast, H, YH } from "../src/world/coast.js";

const SEEDS = ["1", "42", "coast", "sydney", "1234567890123"];

test.each(SEEDS)("seed %s: segments tile x with no gaps or overlaps, alternating", (seed) => {
  const c = createCoast(seed);
  const segs = c.segmentsIn(-20000, 20000);
  expect(segs.length).toBeGreaterThan(20);
  for (let i = 1; i < segs.length; i++) {
    expect(segs[i].x0).toBe(segs[i - 1].x1);
    expect(segs[i].type).not.toBe(segs[i - 1].type);
  }
  for (const s of segs) {
    const w = s.x1 - s.x0;
    if (s.type === "beach") expect(w).toBeGreaterThanOrEqual(900), expect(w).toBeLessThanOrEqual(2600);
    else expect(w).toBeGreaterThanOrEqual(500), expect(w).toBeLessThanOrEqual(1100);
  }
});

test.each(SEEDS)("seed %s: the shore is continuous across every segment boundary", (seed) => {
  const c = createCoast(seed);
  for (const s of c.segmentsIn(-20000, 20000)) {
    const gap = Math.abs(c.shore(s.x0 - 1e-6) - c.shore(s.x0));
    expect(gap, `boundary at x=${s.x0}`).toBeLessThan(0.01);
  }
});

test.each(SEEDS)("seed %s: the shore has no cliff-like jumps", (seed) => {
  // The waterline turns sharply where a bay meets a headland, but it never steps.
  const c = createCoast(seed);
  let prev = c.shore(-20000);
  for (let x = -19999.5; x <= 20000; x += 0.5) {
    const y = c.shore(x);
    expect(Math.abs(y - prev), `at x=${x}`).toBeLessThan(4);
    prev = y;
  }
});

test.each(SEEDS)("seed %s: horizon < shore < dune < bottom everywhere", (seed) => {
  const c = createCoast(seed);
  for (let x = -20000; x <= 20000; x += 3) {
    const a = c.at(x);
    expect(a.yh).toBe(YH);
    expect(a.shore).toBeGreaterThan(YH);
    expect(a.dune).toBeGreaterThan(a.shore);
    expect(a.dune).toBeLessThan(H);
  }
});

test("the same x gives the same answer whatever was looked up first", () => {
  const a = createCoast("coast");
  const b = createCoast("coast");
  b.at(15000);
  b.at(-15000);
  for (let x = -16000; x < 16000; x += 997) expect(b.at(x)).toEqual(a.at(x));
});

test("bays are nearest the viewer mid-bay", () => {
  const c = createCoast("coast");
  for (const s of c.segmentsIn(-8000, 8000).filter((s) => s.type === "beach")) {
    const mid = c.shore((s.x0 + s.x1) / 2);
    expect(mid).toBeGreaterThan(c.shore(s.x0 + 1) + 50);
    expect(mid).toBeGreaterThan(c.shore(s.x1 - 1) + 50);
  }
});
