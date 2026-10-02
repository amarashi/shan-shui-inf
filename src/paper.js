// Upstream's paper texture: a warm off-white 512 x 512 noise tile, mirrored into four
// quadrants. Upstream drew it on a hidden canvas after the first screen. It consumes one
// random number per pixel of the first quadrant, so it must run at the same point in the
// sequence to keep the world identical (PLAN.md fact 12).
import { Noise } from "./noise.js";

/**
 * @param {(fillStyle: string, x: number, y: number) => void} fillPixel draws one 1 x 1 pixel.
 *   Pass a no-op to consume the random numbers without drawing.
 */
export function paperTexture(fillPixel) {
  var reso = 512;

  for (var i = 0; i < reso / 2 + 1; i++) {
    for (var j = 0; j < reso / 2 + 1; j++) {
      var c = 245 + Noise.noise(i * 0.1, j * 0.1) * 10;
      c -= Math.random() * 20;

      var r = c.toFixed(0);
      var g = (c * 0.95).toFixed(0);
      var b = (c * 0.85).toFixed(0);
      var style = "rgb(" + r + "," + g + "," + b + ")";
      fillPixel(style, i, j);
      fillPixel(style, reso - i, j);
      fillPixel(style, i, reso - j);
      fillPixel(style, reso - i, reso - j);
    }
  }
}
