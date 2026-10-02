// Golden master: the modules must reproduce upstream/index.html.
// golden/upstream.json was recorded from the real page in Chromium (tools/golden.js).
//
// Node runs a different V8 than Chromium, and the one full-precision number upstream prints
// (a sign's rotate()) can differ in the last bit, so this test compares normalised hashes
// (tools/lib/normalise.js). Byte-for-byte equality is checked in Chromium by
// `pnpm golden:check -- --source modules`.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { normalise } from "../tools/lib/normalise.js";
import { Noise } from "../src/noise.js";
import { paperTexture } from "../src/paper.js";
import { random, seed } from "../src/rng.js";
import { createWorld } from "../src/world/upstream.js";

const golden = JSON.parse(readFileSync(new URL("../golden/upstream.json", import.meta.url), "utf8"));
const sha = (s) => createHash("sha256").update(normalise(s)).digest("hex");

// Phase 1 step 1: generation still calls Math.random, patched as upstream did.
Math.random = random;

/** Replay a page load of upstream/index.html?seed=S followed by the golden scroll script. */
function replay(s) {
  Noise.reset(); // a fresh page starts with an empty noise table
  seed(s);
  const world = createWorld();
  const views = [];
  for (let i = 0; i < golden.steps.length; i++) {
    if (i === 0) {
      world.update(); // inline script in #BG
      paperTexture(() => {}); // last script on the page; consumes random numbers
    } else {
      world.xcroll(golden.steps[i]);
    }
    views.push(sha(world.MEM.canv));
  }
  return { world, views };
}

describe.each(Object.keys(golden.seeds))("seed %s", (s) => {
  const want = golden.seeds[s];
  const { world, views } = replay(s);

  test("every chunk matches upstream", () => {
    const got = world.MEM.chunks.map((c) => sha(c.canv));
    const firstBad = got.findIndex((h, i) => h !== want.chunks[i]?.normSha);
    expect(firstBad, `first differing chunk: ${JSON.stringify(want.chunks[firstBad])}`).toBe(-1);
    expect(got.length).toBe(want.chunks.length);
  });

  test("the view after every scroll step matches upstream", () => {
    expect(views).toEqual(want.steps.map((st) => st.viewNormSha));
  });
});
