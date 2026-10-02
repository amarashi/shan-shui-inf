// Golden master for the engine (recorded at the end of Phase 2). Any change in output fails
// here, so output only changes on purpose. After a deliberate change, review the contact
// sheet, then re-record:
//
//   UPDATE_GOLDEN=1 pnpm vitest run test/engine-golden.test.js
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "vitest";
import { createWorld } from "../src/world/chunks.js";

const FILE = new URL("../golden/engine.json", import.meta.url);
const SEEDS = ["1", "42", "coast", "sydney", "1234567890123"];
const KS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8];
const VIEWS = [0, 1700, -2600];
const sha = (s) => createHash("sha256").update(s).digest("hex");

function record() {
  const out = { note: "Engine output hashes; see test/engine-golden.test.js", seeds: {} };
  for (const seed of SEEDS) {
    const w = createWorld({ seed });
    const chunks = {};
    for (const k of KS) chunks[k] = sha(w.chunk(k).map((p) => p.canv).join("\n"));
    const views = {};
    for (const x of VIEWS) {
      const v = createWorld({ seed });
      v.MEM.cursx = x;
      v.update();
      views[x] = sha(v.MEM.canv);
    }
    out.seeds[seed] = { chunks, views };
  }
  return out;
}

test("engine output matches golden/engine.json", () => {
  const got = record();
  if (process.env.UPDATE_GOLDEN) {
    writeFileSync(FILE, JSON.stringify(got, null, 1) + "\n");
    return;
  }
  expect(existsSync(FILE), "golden/engine.json is missing; record it with UPDATE_GOLDEN=1").toBe(true);
  const want = JSON.parse(readFileSync(FILE, "utf8"));
  for (const seed of SEEDS) {
    for (const k of KS) expect(got.seeds[seed].chunks[k], `seed ${seed}, chunk ${k}`).toBe(want.seeds[seed].chunks[k]);
    for (const x of VIEWS) expect(got.seeds[seed].views[x], `seed ${seed}, view at ${x}`).toBe(want.seeds[seed].views[x]);
  }
});
