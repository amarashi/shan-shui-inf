// Smooth noise for terrain, foliage placement and brush wobble.
//
// Upstream used Perlin-style value noise copied from p5.js (LGPL 2.1). This replaces it
// with simplex noise from the MIT-licensed `simplex-noise` package, summed over 4 octaves
// like p5 (each octave double the frequency, half the amplitude), then calibrated so that
// upstream's thresholds still mean what they meant:
//   - mean 0.472 and spread (standard deviation) 0.125, as measured for p5's noise;
//   - inputs scaled by 0.42, so values change as quickly over a given distance as p5's.
// (Measured with 200,000 samples on 3 October 2026; see docs/decisions.md.)
//
// Element code calls Noise.noise(x, y, z), which reads the noise set by withNoise().
import { createNoise3D } from "simplex-noise";

var MEAN = 0.472;
var SPREAD = 0.125 / 0.246; // p5 spread / spread of the raw 4-octave simplex sum
var SCALE = 0.42;

/**
 * A noise function in [0, 1], fixed by `rand` (used once, to build the tables).
 * @param {() => number} rand
 * @returns {(x: number, y?: number, z?: number) => number}
 */
export function createNoise(rand) {
  var n3 = createNoise3D(rand);
  return function (x, y, z) {
    x = x * SCALE;
    y = (y || 0) * SCALE;
    z = (z || 0) * SCALE;
    var r = 0;
    var a = 0.5;
    for (var o = 0; o < 4; o++) {
      r += a * n3(x, y, z);
      a *= 0.5;
      x *= 2;
      y *= 2;
      z *= 2;
    }
    var v = MEAN + r * SPREAD;
    return v < 0 ? 0 : v > 1 ? 1 : v;
  };
}

var current = null;

/** Upstream's interface: Noise.noise(x, y, z), reading the noise set by withNoise(). */
export var Noise = {
  noise: function (x, y, z) {
    if (current === null) throw new Error("Noise.noise() called outside withNoise()");
    return current(x, y, z);
  },
  /**
   * Standardised noise: mean 0, spread 1 (mostly between -2 and 2). Use this to drive shapes;
   * Noise.noise() varies only about +-0.12 around 0.47, like upstream's.
   */
  z: function (x, y, z) {
    return (Noise.noise(x, y, z) - MEAN) / 0.125;
  },
};

/**
 * Run `body` with `noise` as the source for Noise.noise().
 * @template T
 * @param {(x: number, y?: number, z?: number) => number} noise
 * @param {() => T} body
 * @returns {T}
 */
export function withNoise(noise, body) {
  var prev = current;
  current = noise;
  try {
    return body();
  } finally {
    current = prev;
  }
}
