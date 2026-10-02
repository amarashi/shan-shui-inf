// Seeded pseudo-random generator from upstream (Prng). Same arithmetic, same call order:
// s <- s * s mod (p * q), returning s / (p * q).
//
// Upstream replaced Math.random with Prng.next and added Math.seed. This module does not
// touch Math; callers use random() and seed().

var p = 999979; //9887//983
var q = 999983; //9967//991
var m = p * q;
var s = 1234;

/** Upstream Prng.hash: base64 of the JSON, read as digits in base 128. */
export function hash(x) {
  var y = btoa(JSON.stringify(x));
  var z = 0;
  for (var i = 0; i < y.length; i++) {
    z += y.charCodeAt(i) * Math.pow(128, i);
  }
  return z;
}

/** Upstream Prng.seed. With no argument it seeds from the current time, as upstream does. */
export function seed(x) {
  if (x == undefined) {
    x = new Date().getTime();
  }
  var y = 0;
  var z = 0;
  function redo() {
    y = (hash(x) + z) % m;
    z += 1;
  }
  while (y % p == 0 || y % q == 0 || y == 0 || y == 1) {
    redo();
  }
  s = y;
  for (var i = 0; i < 10; i++) {
    next();
  }
}

/** Upstream Prng.next: a number in [0, 1). */
export function next() {
  s = (s * s) % m;
  return s / m;
}

export const random = next;
