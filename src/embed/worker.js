// Web Worker: generates chunks (and the paper texture) off the main thread.
//
// Messages in:
//   { type: "init", gen, seed, scene, palette } start a world (gen numbers replies)
//   { type: "chunks", gen, ks: number[] }       generate these chunks, nearest first
//   { type: "forget", gen, kmin, kmax }         drop cached plans outside the range
//   { type: "paper", gen }                      draw the 512 x 512 paper tile
// Messages out:
//   { type: "chunk", gen, k, parts }            parts without display lists (markup only)
//   { type: "paper", gen, width, height, data } RGBA pixels, transferred
import { withNoise } from "../noise.js";
import { paperTexture } from "../paper.js";
import { palettes } from "../render/palette.js";
import { stream, withRandom } from "../rng.js";
import { createGenerator } from "../world/generator.js";

var gen = null;
var genId = -1;

self.onmessage = function (e) {
  var m = e.data;
  if (m.type === "init") {
    gen = createGenerator({ seed: m.seed, scene: m.scene, palette: palettes[m.palette] || palettes.ink });
    genId = m.gen;
    return;
  }
  if (gen === null || m.gen !== genId) return;

  if (m.type === "chunks") {
    for (var k of m.ks) {
      var parts = gen.chunk(k).map(function (p) {
        return { id: p.id, tag: p.tag, x: p.x, y: p.y, k: p.k, i: p.i, p: p.p, canv: p.canv };
      });
      self.postMessage({ type: "chunk", gen: genId, k: k, parts: parts });
    }
  } else if (m.type === "forget") {
    gen.forget(m.kmin, m.kmax);
  } else if (m.type === "paper") {
    var size = 512;
    var data = new Uint8ClampedArray(size * size * 4);
    withNoise(gen.noise, function () {
      withRandom(stream(gen.seed, "paper"), function () {
        paperTexture(function (style, x, y) {
          if (x >= size || y >= size) return; // the tile mirrors onto x = 512 and y = 512
          var rgb = style.slice(4, -1).split(",");
          var o = (y * size + x) * 4;
          data[o] = +rgb[0];
          data[o + 1] = +rgb[1];
          data[o + 2] = +rgb[2];
          data[o + 3] = 255;
        });
      });
    });
    self.postMessage({ type: "paper", gen: genId, width: size, height: size, data: data }, [data.buffer]);
  }
};
