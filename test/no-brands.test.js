// No real brands, logos or identifiable places (PLAN.md section 8).
import { expect, test } from "vitest";
import { replay } from "./support/replay.js";

test("no text in a long stretch of world", () => {
  for (const seed of ["1", "42", "coast", "1234567890123"]) {
    const world = replay(seed, [3000, 3000, -9000]);
    const texts = world.MEM.chunks.flatMap((c) => c.list).filter((r) => r.type === "text");
    expect(texts.map((t) => t.text)).toEqual([]);
  }
});
