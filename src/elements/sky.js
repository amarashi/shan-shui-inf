// The sky (PLAN.md 3.2): sparse cloud bands and a few birds. The graded wash is a colour
// effect and comes with the palettes in Phase 5.
import { random } from "../rng.js";
import { stroke } from "../brush.js";
import { Noise } from "../noise.js";
import { tone } from "../render/palette.js";

/** Clouds and birds over [x0, x1). */
export function sky(x0, x1, coast) {
  var canv = [];
  // Cloud bands: a few long, faint horizontal strokes, offset like a loaded brush.
  for (var c = 0; c < 2; c++) {
    var cx = x0 + (x1 - x0) * random();
    if (Noise.z(cx * 0.0015, 9.1) < 0.2) continue;
    var cy = 40 + (coast.yh - 110) * random();
    var len = 200 + 500 * random();
    var strokes = 2 + Math.floor(4 * random());
    for (var k = 0; k < strokes; k++) {
      var sx = cx + (random() - 0.5) * len * 0.4;
      var sy = cy + k * (3 + 5 * random());
      var sl = len * (0.4 + 0.6 * random());
      var pts = [];
      for (var u = 0; u <= sl; u += 10) pts.push([sx + u, sy + 2 * Math.sin(u / 60 + k)]);
      canv.push(...stroke(pts, { col: tone("sky", (0.04 + 0.06 * random()).toFixed(3)), wid: 2 + 5 * random(), noi: 0.9 }));
    }
  }
  // Birds: an occasional small flock.
  if (random() < 0.18) {
    var bx = x0 + (x1 - x0) * random();
    var by = 60 + (coast.yh - 120) * random();
    var n = 2 + Math.floor(5 * random());
    for (var b = 0; b < n; b++) {
      var x = bx + (random() - 0.5) * 80;
      var y = by + (random() - 0.5) * 30;
      var span = 3 + 4 * random();
      var flap = span * (0.2 + 0.4 * random());
      canv.push(
        ...stroke(
          [
            [x - span, y - flap],
            [x - span * 0.4, y - flap * 0.2],
            [x, y],
            [x + span * 0.4, y - flap * 0.2],
            [x + span, y - flap],
          ],
          { col: tone("ink", (0.4 + 0.2 * random()).toFixed(3)), wid: 0.8, fun: (t) => 0.6 + 0.4 * Math.sin(t * Math.PI) },
        ),
      );
    }
  }
  return canv;
}
