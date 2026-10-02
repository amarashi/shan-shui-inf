// Build a world for a seed, show the first screen, then scroll.
import { createWorld } from "../../src/world/chunks.js";

/**
 * @param {string} s seed
 * @param {number[]} scrolls xcroll amounts after the first screen
 * @param {(world: ReturnType<typeof createWorld>) => void} [afterEachStep]
 * @param {object} [opts] extra createWorld options
 */
export function replay(s, scrolls = [], afterEachStep = () => {}, opts = {}) {
  const world = createWorld({ seed: s, ...opts });
  world.update();
  afterEachStep(world);
  for (const dx of scrolls) {
    world.xcroll(dx);
    afterEachStep(world);
  }
  return world;
}
