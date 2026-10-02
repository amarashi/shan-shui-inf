// Golden master for the upstream page.
//
//   node tools/golden.js record   write golden/upstream.json
//   node tools/golden.js check    re-run and compare against golden/upstream.json
//
// For each seed: load upstream/index.html?seed=S, then run a fixed scroll script through
// upstream's own `xcroll`. After every step we hash MEM.canv (the markup on screen). At the
// end we hash every chunk in MEM.chunks, in order, so a later mismatch can be traced to one
// chunk (tag, x, y). Hashing happens in the page; only hashes cross into Node, because the
// on-screen SVG alone is about 14 MB.
//
// Every hash is recorded twice: raw (byte for byte) and after normalise() (see
// tools/lib/normalise.js), which absorbs last-bit maths differences between engines.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { normalise } from "./lib/normalise.js";
import { launch, openUpstream, xcroll } from "./lib/upstream.js";

export const SEEDS = ["1", "42", "coast", "sydney", "1234567890123"];
// 0 = state after page load. Then right 3 times and left 5 times, so chunks are generated
// on both sides (scroll order changes the world upstream; see PLAN.md fact 5).
export const STEPS = [0, 400, 400, 400, -400, -400, -400, -400, -400];

const GOLDEN = new URL("../golden/upstream.json", import.meta.url);

function snapshot(page, withChunks) {
  return page.evaluate(async ({ withChunks, normaliseSrc }) => {
    const normalise = (0, eval)("(" + normaliseSrc + ")");
    const enc = new TextEncoder();
    const sha = async (s) =>
      [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    const out = {
      cursx: MEM.cursx,
      xmin: MEM.xmin,
      xmax: MEM.xmax,
      chunkCount: MEM.chunks.length,
      viewBytes: MEM.canv.length,
      viewSha: await sha(MEM.canv),
      viewNormSha: await sha(normalise(MEM.canv)),
    };
    if (withChunks) {
      out.chunks = [];
      for (const c of MEM.chunks) {
        out.chunks.push({
          tag: c.tag,
          x: c.x,
          y: c.y,
          bytes: c.canv.length,
          sha: await sha(c.canv),
          normSha: await sha(normalise(c.canv)),
        });
      }
      out.worldSha = await sha(MEM.chunks.map((c) => c.canv).join("\n"));
    }
    return out;
  }, { withChunks, normaliseSrc: normalise.toString() });
}

export async function recordSeed(browser, seed) {
  const page = await openUpstream(browser, seed);
  const steps = [];
  for (let i = 0; i < STEPS.length; i++) {
    if (STEPS[i] !== 0) await xcroll(page, STEPS[i]);
    const snap = await snapshot(page, i === STEPS.length - 1);
    steps.push({ dx: STEPS[i], ...snap });
  }
  await page.close();
  const last = steps[steps.length - 1];
  const { chunks, worldSha } = last;
  delete last.chunks;
  delete last.worldSha;
  return { steps, worldSha, chunks };
}

export async function recordAll() {
  const browser = await launch();
  const result = { chromium: browser.version(), steps: STEPS, seeds: {} };
  for (const seed of SEEDS) result.seeds[seed] = await recordSeed(browser, seed);
  await browser.close();
  return result;
}

function compare(want, got) {
  const problems = [];
  for (const seed of SEEDS) {
    const w = want.seeds[seed];
    const g = got.seeds[seed];
    w.steps.forEach((ws, i) => {
      if (ws.viewSha !== g.steps[i].viewSha) problems.push(`seed ${seed}: step ${i} (dx ${ws.dx}) view differs`);
    });
    if (w.worldSha !== g.worldSha) {
      const n = Math.max(w.chunks.length, g.chunks.length);
      for (let i = 0; i < n; i++) {
        if (w.chunks[i]?.sha !== g.chunks[i]?.sha) {
          problems.push(`seed ${seed}: first differing chunk is #${i} ${JSON.stringify(w.chunks[i] ?? null)}`);
          break;
        }
      }
    }
  }
  return problems;
}

const mode = process.argv[2];
if (mode === "record") {
  const result = await recordAll();
  mkdirSync(new URL(".", GOLDEN), { recursive: true });
  writeFileSync(GOLDEN, JSON.stringify(result, null, 1) + "\n");
  for (const [seed, r] of Object.entries(result.seeds)) {
    console.log(`${seed.padEnd(14)} world ${r.worldSha.slice(0, 16)}  chunks ${r.chunks.length}`);
  }
  console.log(`recorded with Chromium ${result.chromium}`);
} else if (mode === "check") {
  const want = JSON.parse(readFileSync(GOLDEN, "utf8"));
  const got = await recordAll();
  if (got.chromium !== want.chromium) console.log(`note: recorded with Chromium ${want.chromium}, now ${got.chromium}`);
  const problems = compare(want, got);
  if (problems.length) {
    console.log(problems.join("\n"));
    process.exit(1);
  }
  console.log(`golden OK: ${SEEDS.length} seeds x ${STEPS.length} steps match`);
} else if (mode) {
  console.error("usage: node tools/golden.js record|check");
  process.exit(2);
}
