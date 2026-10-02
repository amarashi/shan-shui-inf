// Normalisation for golden comparisons across JavaScript engines.
//
// Upstream prints every polyline coordinate with toFixed(1), which hides last-bit
// differences in Math.sin, Math.atan2 and friends. The one exception is the sign text in
// Arch's roof(), whose transform='translate(..) rotate(..)' is printed at full precision.
// Node 24 (V8 13.6) and Chromium 151 differ there in the last bit for some seeds. This
// rounds numbers inside transform attributes to 10 significant digits.
//
// Self-contained (no imports, no closures) so tools/golden.js can run it inside the page.
export function normalise(svg) {
  return svg.replace(/transform='[^']*'/g, (t) =>
    t.replace(/-?\d+(\.\d+)?(e[-+]?\d+)?/g, (n) => String(Number(Number(n).toPrecision(10)))),
  );
}
