// Replays what upstream/index.html does on load: fresh noise table, seed, first update(),
// then the paper texture's random numbers, then optional scroll steps.
import { Noise } from "../../src/noise.js";
import { paperTexture } from "../../src/paper.js";
import { seed } from "../../src/rng.js";
import { createWorld } from "../../src/world/upstream.js";

/**
 * @param {string} s seed
 * @param {number[]} scrolls xcroll amounts after the first screen
 * @param {(world: ReturnType<typeof createWorld>) => void} [afterEachStep]
 */
export function replay(s, scrolls = [], afterEachStep = () => {}) {
  Noise.reset(); // a fresh page starts with an empty noise table
  seed(s);
  const world = createWorld();
  world.update(); // inline script in #BG
  paperTexture(() => {}); // last script on the page; consumes random numbers
  afterEachStep(world);
  for (const dx of scrolls) {
    world.xcroll(dx);
    afterEachStep(world);
  }
  return world;
}
