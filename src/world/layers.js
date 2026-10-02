// Layer registry. Replaces the tag if/else chain in upstream's chunkloader.
//
// A layer turns one planned record {tag, x, y, ...} into one or more parts {y, list}.
// Each part becomes a chunk; chunks are painted in order of y (larger y is nearer).
// draw(record, index) receives the record's index in its plan, which upstream used to
// derive element seeds.
//
// The bodies below are upstream's, call for call, so the order of random() calls (and so
// the output) is unchanged. `plan` hooks are added with chunk-local randomness.
import { Arch } from "../elements/structures.js";
import { water } from "../elements/sea.js";
import { Mount } from "../elements/terrain.js";
import { randChoice } from "../geom.js";
import { random } from "../rng.js";

/** @typedef {{name: string, draw: (r: {x: number, y: number}, i: number) => {y: number, list: object[]}[]}} Layer */

/** @type {Record<string, Layer>} */
export const LAYERS = {};

/** @param {Layer} layer */
export function registerLayer(layer) {
  LAYERS[layer.name] = layer;
}

registerLayer({
  name: "mount",
  draw: (r, i) => [
    { y: r.y, list: Mount.mountain(r.x, r.y, i * 2 * random()) },
    // water under each mountain, drawn before everything else
    { y: r.y - 10000, list: water(r.x, r.y, i * 2) },
  ],
});

registerLayer({
  name: "flatmount",
  draw: (r) => [
    {
      y: r.y,
      list: Mount.flatMount(r.x, r.y, 2 * random() * Math.PI, {
        wid: 600 + random() * 400,
        hei: 100,
        cho: 0.5 + random() * 0.2,
      }),
    },
  ],
});

registerLayer({
  name: "distmount",
  draw: (r) => [
    {
      y: r.y,
      list: Mount.distMount(r.x, r.y, random() * 100, {
        hei: 150,
        len: randChoice([500, 1000, 1500]),
      }),
    },
  ],
});

registerLayer({
  name: "boat",
  draw: (r) => [
    {
      y: r.y,
      list: Arch.boat01(r.x, r.y, random(), {
        sca: r.y / 800,
        fli: randChoice([true, false]),
      }),
    },
  ],
});
