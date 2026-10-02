// Seeded randomness with independent streams.
//
// stream(...keys) returns a generator for those keys: the same keys always give the same
// sequence, and different keys give unrelated sequences. A world derives one stream per
// chunk and layer, so chunks can be generated in any order and regenerate identically.
//
// Element code calls random(), which reads the stream set by withRandom(). Generation is
// synchronous, so this is safe even with several worlds on one page. Nothing touches
// Math.random.
import { uniformFloat64 } from "pure-rand/distribution/uniformFloat64";
import { xoroshiro128plus } from "pure-rand/generator/xoroshiro128plus";

/**
 * 32-bit hash of any JSON-serialisable keys (cyrb53, truncated). Not cryptographic.
 * @param {...unknown} keys
 */
export function hash(...keys) {
  var str = JSON.stringify(keys);
  var h1 = 0xdeadbeef;
  var h2 = 0x41c6ce57;
  for (var i = 0; i < str.length; i++) {
    var ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 ^ h1) >>> 0;
}

/**
 * A generator of numbers in [0, 1) for these keys.
 * @param {...unknown} keys for example (seed, "plan", chunkIndex)
 * @returns {() => number}
 */
export function stream(...keys) {
  var g = xoroshiro128plus(hash(...keys));
  return function () {
    return uniformFloat64(g);
  };
}

var current = null;

/** A number in [0, 1) from the current stream. Only valid inside withRandom(). */
export function random() {
  if (current === null) throw new Error("random() called outside withRandom()");
  return current();
}

/**
 * Run `body` with `rand` as the source for random().
 * @template T
 * @param {() => number} rand
 * @param {() => T} body
 * @returns {T}
 */
export function withRandom(rand, body) {
  var prev = current;
  current = rand;
  try {
    return body();
  } finally {
    current = prev;
  }
}
