// Golden master: the modules must reproduce upstream/index.html.
// golden/upstream.json was recorded from the real page in Chromium (tools/golden.js).
//
// Node runs a different V8 than Chromium, and the one full-precision number upstream prints
// (a sign's rotate()) can differ in the last bit, so this test compares normalised hashes
// (tools/lib/normalise.js). Byte-for-byte equality is checked in Chromium by
// `pnpm golden:check --source modules`.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { normalise } from "../tools/lib/normalise.js";
import { random } from "../src/rng.js";
import { replay } from "./support/replay.js";

const golden = JSON.parse(readFileSync(new URL("../golden/upstream.json", import.meta.url), "utf8"));
const sha = (s) => createHash("sha256").update(normalise(s)).digest("hex");

// Generation uses random() from src/rng.js. Math.random is never patched, and a poisoned
// Math.random proves nothing calls it.
const realMathRandom = Math.random;
Math.random = () => {
  throw new Error("generation must not call Math.random");
};

test("the modules do not replace Math.random", () => {
  expect(random).not.toBe(Math.random);
  expect(realMathRandom.toString()).toContain("[native code]");
});

describe.each(Object.keys(golden.seeds))("seed %s", (s) => {
  const want = golden.seeds[s];
  const views = [];
  const world = replay(s, golden.steps.slice(1), (w) => views.push(sha(w.MEM.canv)));

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
