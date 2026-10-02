import { createNoise3D } from "simplex-noise";
import { Noise } from "../src/noise.js";
import { seed, random } from "../src/rng.js";
seed("stats");
const N = 200000;
const stats = (f) => {
  let s = 0, s2 = 0, lo = 1e9, hi = -1e9; const xs = [];
  for (let i = 0; i < N; i++) { const v = f(i); s += v; s2 += v * v; lo = Math.min(lo, v); hi = Math.max(hi, v); if (i < 20000) xs.push(v); }
  xs.sort((a, b) => a - b); const m = s / N;
  return { mean: +m.toFixed(4), std: +Math.sqrt(s2 / N - m * m).toFixed(4), min: +lo.toFixed(3), max: +hi.toFixed(3), p05: +xs[1000].toFixed(3), p95: +xs[19000].toFixed(3) };
};
// sample points spread over a large range, like world coordinates times typical scales
const pt = () => [random() * 2000, random() * 200, random() * 20];
const P = Array.from({ length: N }, pt);
console.log("p5 1D", stats((i) => Noise.noise(P[i][0])));
console.log("p5 2D", stats((i) => Noise.noise(P[i][0], P[i][1])));
console.log("p5 3D", stats((i) => Noise.noise(P[i][0], P[i][1], P[i][2])));
const n3 = createNoise3D(random);
const fbm = (x, y, z) => { let r = 0, a = 0.5, f = 1; for (let o = 0; o < 4; o++) { r += a * n3(x * f, y * f, z * f); a *= 0.5; f *= 2; } return r; };
console.log("simplex fbm 1D", stats((i) => fbm(P[i][0], 0, 0)));
console.log("simplex fbm 2D", stats((i) => fbm(P[i][0], P[i][1], 0)));
console.log("simplex fbm 3D", stats((i) => fbm(P[i][0], P[i][1], P[i][2])));
// correlation length: mean |n(x+d)-n(x)| for small d
for (const d of [0.05, 0.2, 1]) {
  console.log("d", d, "p5 step", stats((i) => Math.abs(Noise.noise(P[i][0] + d, P[i][1]) - Noise.noise(P[i][0], P[i][1]))).mean,
    "simplex step", stats((i) => Math.abs(fbm(P[i][0] + d, P[i][1], 0) - fbm(P[i][0], P[i][1], 0))).mean);
}
console.log("--- fit input scale k (normalised step = mean|dn| / std) ---");
const norm = (f, d, std) => { let s = 0; for (let i = 0; i < 40000; i++) s += Math.abs(f(P[i][0] + d, P[i][1]) - f(P[i][0], P[i][1])); return s / 40000 / std; };
const p5n = (x, y) => Noise.noise(x, y);
const target = [0.05, 0.2, 1, 3].map((d) => norm(p5n, d, 0.1245));
console.log("p5", target.map((v) => v.toFixed(3)).join(" "));
for (const k of [0.3, 0.35, 0.4, 0.45, 0.5, 0.6]) {
  const f = (x, y) => fbm(x * k, y * k, 0);
  const got = [0.05, 0.2, 1, 3].map((d) => norm(f, d, 0.2458));
  const err = got.reduce((e, v, i) => e + (Math.log(v / target[i])) ** 2, 0);
  console.log("k", k, got.map((v) => v.toFixed(3)).join(" "), "err", err.toFixed(3));
}
