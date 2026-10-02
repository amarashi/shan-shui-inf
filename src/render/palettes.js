// Colour palettes (PLAN.md Phase 5). A palette turns role colours into CSS:
//   body(role, shade)  an opaque watercolour wash for the role (shade picks within a range,
//                      e.g. deep to shallow sea), varied slightly per shape
//   tone(role, a, rgb) a line: the role's ink at opacity a; greys lighter than upstream's
//                      standard ink blend towards the role's wash
// Aerial perspective: colours near the horizon shift towards the sky and lose contrast.
// Variation comes from a hash of the shape's own position, never from random(), so palettes
// cannot change geometry and the ink palette stays exactly upstream's.
import { YH, H } from "../world/coast.js";

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c, a) =>
  a === undefined || a === null
    ? "rgb(" + c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(",") + ")"
    : "rgba(" + c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(",") + "," + a + ")";

/** A number in [0, 1) from a shape's first point: stable variation without random(). */
function hash01(rec) {
  var p = rec.pts ? rec.pts[0] : [rec.x, rec.y];
  var s = Math.sin(p[0] * 12.9898 + p[1] * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Depth of a shape: 0 at the horizon, 1 at the bottom of the picture. */
function depthOf(rec) {
  var y;
  if (rec.pts) {
    var sum = 0;
    for (var i = 0; i < rec.pts.length; i += Math.max(1, rec.pts.length >> 3)) sum += rec.pts[i][1];
    y = sum / Math.ceil(rec.pts.length / Math.max(1, rec.pts.length >> 3));
  } else y = rec.y;
  return Math.max(0, Math.min(1, (y - YH) / (H - YH)));
}

/**
 * @param {object} d palette definition: name, haze, paper [r,g,b] multipliers, sky [top,
 *   horizon], sea [deep, shallow], sand [dry, wet], rock [face, shadow], foliage, trunk,
 *   structure, foam, ink, cloth (list), flagRed, flagYellow
 */
export function makePalette(d) {
  var C = {};
  for (var k in d) C[k] = Array.isArray(d[k]) ? (typeof d[k][0] === "string" ? d[k].map(hex) : d[k]) : typeof d[k] === "string" ? hex(d[k]) : d[k];
  var skyH = C.sky[1];

  function wash(role, shade, j) {
    switch (role) {
      case "sky":
        return mix(C.sky[0], C.sky[1], shade);
      case "water":
        return mix(C.sea[0], C.sea[1], shade);
      case "foam":
        return C.foam;
      case "sand":
        return mix(C.sand[0], C.sand[1], shade);
      case "rock":
        return mix(C.rock[0], C.rock[1], shade * 0.8 + j * 0.15);
      case "foliage":
        return mix(C.foliage, C.sand[0], 0.35 + 0.25 * j - shade * 0.3);
      case "trunk":
        return C.trunk;
      case "structure":
        return C.structure;
      case "cloth":
        return C.cloth[Math.floor(j * C.cloth.length)];
      case "flag-red":
        return C.flagRed;
      case "flag-yellow":
        return C.flagYellow;
      default:
        return C.structure;
    }
  }
  function inkFor(role) {
    switch (role) {
      case "water":
        return mix(C.ink, C.sea[0], 0.55);
      case "foam":
        return mix(C.ink, C.sea[1], 0.6);
      case "sky":
        return mix(C.ink, C.sky[1], 0.5);
      case "sand":
        return mix(C.ink, C.sand[1], 0.45);
      case "rock":
        return mix(C.ink, C.rock[1], 0.45);
      case "foliage":
        return mix(C.ink, C.foliage, 0.55);
      case "trunk":
        return mix(C.ink, C.rock[1], 0.3);
      case "flag-red":
        return C.flagRed;
      case "flag-yellow":
        return C.flagYellow;
      default:
        return C.ink;
    }
  }

  return {
    name: d.name,
    paper: d.paper || [1, 1, 1],
    paint: function (c, rec) {
      if (c === null || typeof c !== "object") throw new Error("colours must be tone(), body(), NONE or CLEAR, got " + c);
      if (c.none) return "none";
      var depth = rec ? depthOf(rec) : 1;
      var haze = d.haze * Math.pow(1 - depth, 2);
      var j = rec ? hash01(rec) : 0.5;
      if (c.body && c.flat) return css(wash(c.role, c.shade || 0, 0.5));
      if (c.body) {
        var w = wash(c.role, c.shade || 0, j);
        w = mix(w, [255, 255, 255], (j - 0.5) * 0.08); // slight per-shape variation
        return css(mix(w, skyH, haze * (c.role === "sky" ? 0 : 1)));
      }
      if (c.a === 0) return "rgba(0,0,0,0)";
      var L = (c.rgb[0] + c.rgb[1] + c.rgb[2]) / (3 * 255);
      var light = Math.max(0, Math.min(1, (L - 0.39) / 0.61)); // 0 for upstream's ink grey, 1 for white
      if (c.a === null) {
        // opaque greys (upstream's distant mountains): a wash of the role, hazier with distance
        return css(mix(mix(wash(c.role, 0.3, j), skyH, 0.35 + 0.4 * light), skyH, haze));
      }
      var line = mix(inkFor(c.role), wash(c.role, 0.5, j), light);
      line = mix(line, skyH, haze * 0.7);
      var a = typeof c.a === "string" ? parseFloat(c.a) : c.a;
      return css(line, +(a * (1 - 0.4 * haze)).toFixed(3));
    },
  };
}

export const eastCoast = makePalette({
  name: "east-coast",
  haze: 0.65,
  paper: [1, 0.995, 0.98],
  sky: ["#b9d6e8", "#e6eff2"],
  sea: ["#2f6f8f", "#6fb7b7"],
  sand: ["#e8d9b5", "#c9b48a"],
  rock: ["#d49a5e", "#8a5a35"],
  foliage: "#7d9070",
  trunk: "#ece5d6",
  structure: "#f5f1e8",
  foam: "#ffffff",
  ink: "#2b2b2b",
  cloth: ["#c0392b", "#2e6da4", "#e2b33c", "#f2f2f2", "#3b7d5a", "#d9707a"],
  flagRed: "#d0281e",
  flagYellow: "#f2c218",
});

export const overcast = makePalette({
  name: "overcast",
  haze: 0.85,
  paper: [0.97, 0.975, 0.98],
  sky: ["#c4cbcf", "#dfe3e4"],
  sea: ["#4d6470", "#8fa5a8"],
  sand: ["#ddd6c6", "#b9b09e"],
  rock: ["#b49a7c", "#6f5a46"],
  foliage: "#6f7d68",
  trunk: "#e0ddd5",
  structure: "#ecebe6",
  foam: "#f4f6f6",
  ink: "#303436",
  cloth: ["#8e3b33", "#3f5f7a", "#b89a4a", "#e8e8e8", "#4f6b58"],
  flagRed: "#b8322a",
  flagYellow: "#d9b32a",
});

export const goldenHour = makePalette({
  name: "golden-hour",
  haze: 0.6,
  paper: [1, 0.975, 0.93],
  sky: ["#f1c9a0", "#f8e0b6"],
  sea: ["#4f5b78", "#c49f7c"],
  sand: ["#f0d3a0", "#c89c6c"],
  rock: ["#de8a48", "#8a4a2a"],
  foliage: "#6f7a4f",
  trunk: "#f2dcc4",
  structure: "#f7e8d3",
  foam: "#fff4e6",
  ink: "#3a2a22",
  cloth: ["#b8402e", "#365a8a", "#e0a23a", "#f6efe4", "#4a7350"],
  flagRed: "#d0341e",
  flagYellow: "#f2b818",
});

export const COLOUR_PALETTES = { "east-coast": eastCoast, overcast: overcast, "golden-hour": goldenHour };
