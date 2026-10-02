// No real brands, logos or identifiable places (PLAN.md section 8). The only text allowed in
// a scene is generic signage.
import { expect, test } from "vitest";
import { replay } from "./support/replay.js";

const GENERIC = new Set(["KIOSK"]);

test.each(["upstream", "coast"])("the %s scene has only generic signage", (scene) => {
  for (const seed of ["1", "42", "coast", "1234567890123"]) {
    const world = replay(seed, [3000, 3000, -9000], () => {}, { scene });
    const texts = world.MEM.chunks.flatMap((c) => c.list).filter((r) => r.type === "text");
    for (const t of texts) expect(GENERIC.has(t.text), t.text).toBe(true);
  }
});
