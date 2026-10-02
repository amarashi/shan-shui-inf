// Engine elements for specimen sheets (pnpm specimen <name>): drawn in Node, one per cell.
//
// box: the cell's view in world units [x, y, width, height]; the element is drawn at at
// (default [0, 0]). draw(x, y, i) returns a display list; it runs inside withRandom and
// withNoise for the cell, so it may call random() and Noise.
export const ENGINE_ELEMENTS = {};

/** @param {string} name @param {{box: number[], at?: number[], draw: Function}} spec */
export function specimen(name, spec) {
  ENGINE_ELEMENTS[name] = spec;
}
