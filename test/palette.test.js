// Every mark carries a known role, and every palette can paint every mark.
import { expect, test } from "vitest";
import { palettes, ROLES } from "../src/render/palette.js";
import { toSVG } from "../src/render/svg.js";
import { replay } from "./support/replay.js";

const world = replay("coast", [1500, -2500]);
const records = world.MEM.chunks.flatMap((c) => c.list);
const colours = records.flatMap((r) => (r.type === "text" ? [r.fill] : [r.fill, r.stroke]));

test("every colour is a tone, body, NONE or CLEAR with a known role", () => {
  expect(records.length).toBeGreaterThan(10000);
  const bad = colours.filter((c) => !c || typeof c !== "object" || (!c.none && !ROLES.includes(c.role)));
  expect(bad.slice(0, 5)).toEqual([]);
});

test("several roles are in use", () => {
  const used = new Set(colours.filter((c) => !c.none).map((c) => c.role));
  for (const r of ["rock", "foliage", "trunk", "water", "structure"]) expect(used).toContain(r);
});

test.each(Object.keys(palettes))("palette %s paints a whole world", (name) => {
  const svg = toSVG(records.slice(0, 20000), palettes[name]);
  expect(svg).toContain("<polyline");
  expect(svg).not.toContain("undefined");
});
