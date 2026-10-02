// Coastal structures (PLAN.md Phase 4): lighthouse, kiosk, shack, boat shed, jetty, ocean
// pool, flags and boats. They replace upstream's pagodas and pavilions and reuse upstream's
// box, roof and rail brushwork. Each takes a base point (x, y) on the ground or water.
import { random } from "../rng.js";
import { stroke } from "../brush.js";
import { poly, text } from "../render/displaylist.js";
import { body, NONE, tone } from "../render/palette.js";
import { Arch } from "./structures.js";

const ink = (a) => tone("structure", typeof a === "number" ? a.toFixed(3) : a);

/** Lighthouse: tapering white tower, gallery, glazed lantern, dome, keeper's cottage. */
export function lighthouse(x, y, args) {
  args = args || {};
  var hei = args.hei || 70;
  var canv = [];
  var side = random() < 0.5 ? -1 : 1;
  // keeper's cottage beside the tower
  var cw = hei * 0.45;
  var cx = x + side * hei * 0.35;
  canv.push(...Arch.box(cx, y, { hei: hei * 0.12, wid: cw, rot: 0.6, per: 2, tra: false, wei: 1 }));
  canv.push(...Arch.roof(cx, y - hei * 0.12, { hei: hei * 0.1, wid: cw * 1.05, rot: 0.6, per: 2, wei: 1, cor: 2 }));
  // tower
  var b = hei * 0.11;
  var t = hei * 0.065;
  var th = hei * 0.72;
  var tower = [
    [x - b, y],
    [x - t, y - th],
    [x + t, y - th],
    [x + b, y],
  ];
  canv.push(...poly(tower, { fil: body("structure"), str: NONE }));
  canv.push(...stroke([tower[0], [x - (b + t) / 2, y - th / 2], tower[1]], { col: ink(0.5), wid: 1.2, noi: 0.4 }));
  canv.push(...stroke([tower[3], [x + (b + t) / 2, y - th / 2], tower[2]], { col: ink(0.4), wid: 1.2, noi: 0.4 }));
  // a door and two small windows
  canv.push(...stroke([[x - b * 0.25, y], [x - b * 0.25, y - hei * 0.08], [x + b * 0.25, y - hei * 0.08], [x + b * 0.25, y]], { col: ink(0.35), wid: 0.7, fun: () => 1 }));
  for (var wy of [0.35, 0.58]) {
    var yy = y - th * wy;
    canv.push(...stroke([[x - 1, yy], [x - 1, yy - 3], [x + 1, yy - 3], [x + 1, yy]], { col: ink(0.35), wid: 0.6, fun: () => 1 }));
  }
  // gallery
  var gy = y - th;
  var gw = t * 1.9;
  canv.push(...poly([[x - gw, gy], [x + gw, gy], [x + gw, gy - 2], [x - gw, gy - 2]], { fil: body("structure"), str: ink(0.5), wid: 0.8 }));
  for (var r = -gw; r <= gw; r += gw / 3) canv.push(...stroke([[x + r, gy - 2], [x + r, gy - 6]], { col: ink(0.35), wid: 0.5, fun: () => 1 }));
  canv.push(...stroke([[x - gw, gy - 6], [x, gy - 6.2], [x + gw, gy - 6]], { col: ink(0.4), wid: 0.6, fun: () => 1 }));
  // lantern room and dome
  var lw = t * 0.9;
  var lh = hei * 0.1;
  canv.push(...poly([[x - lw, gy - 2], [x + lw, gy - 2], [x + lw, gy - 2 - lh], [x - lw, gy - 2 - lh]], { fil: body("structure"), str: ink(0.5), wid: 0.8 }));
  for (var g = -lw; g <= lw; g += lw / 2) canv.push(...stroke([[x + g, gy - 2], [x + g, gy - 2 - lh]], { col: ink(0.3), wid: 0.5, fun: () => 1 }));
  var dome = [];
  for (var k = 0; k <= 10; k++) {
    var a = Math.PI + (Math.PI * k) / 10;
    dome.push([x + Math.cos(a) * lw * 1.1, gy - 2 - lh + Math.sin(a) * lw * 0.9]);
  }
  canv.push(...poly(dome, { fil: tone("structure", 0.35), str: ink(0.5), wid: 0.8 }));
  canv.push(...stroke([[x, gy - 2 - lh - lw * 0.9], [x, gy - 2 - lh - lw * 0.9 - 4]], { col: ink(0.5), wid: 0.8, fun: () => 1 }));
  return canv;
}

/** Surf club or kiosk: low and wide, skillion roof, awning, a generic sign. */
export function kiosk(x, y, args) {
  args = args || {};
  var wid = args.wid || 70;
  var hei = wid * 0.22;
  var canv = [];
  canv.push(
    ...Arch.box(x, y, {
      hei: hei,
      wid: wid,
      rot: 0.75,
      per: 3,
      tra: false,
      wei: 1.2,
      dec: (a) => Arch.deco(3, Object.assign({}, a, { hsp: [1, 3], vsp: [1, 2] })),
    }),
  );
  // skillion roof: a thin slab rising towards the sea
  var rl = x - wid * 0.55;
  var rr = x + wid * 0.55;
  var roof = [[rl, y - hei], [rr, y - hei - wid * 0.05], [rr, y - hei - wid * 0.05 - 2.5], [rl, y - hei - 2.5]];
  canv.push(...poly(roof, { fil: body("structure"), str: ink(0.5), wid: 1 }));
  // awning over the counter
  canv.push(...stroke([[x - wid * 0.15, y - hei * 0.7], [x + wid * 0.2, y - hei * 0.55]], { col: ink(0.45), wid: 1.2, fun: () => 1 }));
  // a generic sign on the fascia, under the roof edge
  canv.push(...text(x - wid * 0.1, y - hei - 0.6, { size: Math.max(3, hei * 0.22), rot: -2.5, text: args.sign || "KIOSK", fill: ink(0.6) }));
  return canv;
}

/** Beach shack: a small gabled cottage. */
export function shack(x, y, args) {
  args = args || {};
  var wid = args.wid || 36;
  var hei = wid * 0.32;
  var canv = [];
  var rot = 0.3 + 0.4 * random();
  canv.push(...Arch.box(x, y, { hei: hei, wid: wid, rot: rot, per: 3, tra: false, wei: 1 }));
  canv.push(...Arch.roof(x, y - hei, { hei: hei * 0.8, wid: wid * 1.05, rot: rot, per: 3, wei: 1, cor: 2 }));
  // a door
  canv.push(...stroke([[x - 2, y], [x - 2, y - hei * 0.65], [x + 2, y - hei * 0.65], [x + 2, y]], { col: ink(0.4), wid: 0.7, fun: () => 1 }));
  return canv;
}

/** Boat shed: a gabled shed with a big door, near the water. */
export function boatShed(x, y, args) {
  args = args || {};
  var wid = args.wid || 32;
  var hei = wid * 0.4;
  var canv = [];
  canv.push(...Arch.box(x, y, { hei: hei, wid: wid, rot: 0.5, per: 2, tra: false, wei: 1 }));
  canv.push(...Arch.roof(x, y - hei, { hei: hei * 0.7, wid: wid * 1.05, rot: 0.5, per: 2, wei: 1, cor: 2 }));
  canv.push(...poly([[x - wid * 0.3, y], [x - wid * 0.3, y - hei * 0.8], [x + wid * 0.1, y - hei * 0.8], [x + wid * 0.1, y]], { fil: tone("structure", 0.25), str: ink(0.45), wid: 0.8 }));
  return canv;
}

/** Jetty: a deck on piles running from (x, y) out to sea. dir is +1 or -1 (sideways lean). */
export function jetty(x, y, args) {
  args = args || {};
  var len = args.len || 90; // in y, towards the horizon
  var dir = args.dir || 1;
  var near = args.near || 0.5; // scale at the shore
  var canv = [];
  var w = 10 * near + 2;
  var x1 = x + dir * len * 0.35;
  var y1 = y - len;
  var deckA = [[x - w, y], [x1 - w * 0.5, y1]];
  var deckB = [[x + w, y], [x1 + w * 0.5, y1]];
  canv.push(...poly([deckA[0], deckA[1], deckB[1], deckB[0]], { fil: body("structure"), str: NONE }));
  canv.push(...stroke(deckA, { col: ink(0.5), wid: 1, fun: () => 1 }));
  canv.push(...stroke(deckB, { col: ink(0.5), wid: 1.2, fun: () => 1 }));
  // piles, shorter with distance
  for (var k = 0; k <= 8; k++) {
    var u = k / 8;
    var s = 1 - 0.6 * u;
    var px = x + (x1 - x) * u + w * (1 - 0.5 * u);
    var py = y + (y1 - y) * u;
    canv.push(...stroke([[px, py], [px, py + 7 * near * s]], { col: ink(0.45), wid: 1.2 * s, fun: () => 1 }));
  }
  return canv;
}

/** Ocean pool: a rock-edged rectangle on the platform, seen in perspective. */
export function oceanPool(x, y, args) {
  args = args || {};
  var wid = args.wid || 50;
  var dep = wid * 0.18;
  var canv = [];
  var p = [
    [x - wid / 2, y],
    [x + wid / 2, y],
    [x + wid / 2 - 4, y - dep],
    [x - wid / 2 + 4, y - dep],
  ];
  canv.push(...poly(p, { fil: body("water"), str: ink(0.5), wid: 1.4 }));
  for (var k = 1; k < 4; k++) {
    var yy = y - (dep * k) / 4;
    var inset = 4 * (k / 4);
    canv.push(...stroke([[x - wid / 2 + inset + 3, yy], [x, yy + 0.4], [x + wid / 2 - inset - 3, yy]], { col: tone("water", 0.2), wid: 0.6 }));
  }
  return canv;
}

/** A pair of red-over-yellow surf lifesaving flags, `gap` apart. */
export function flags(x, y, args) {
  args = args || {};
  var gap = args.gap || 60;
  var h = args.hei || 14;
  var canv = [];
  for (var side of [-1, 1]) {
    var px = x + (side * gap) / 2;
    canv.push(...stroke([[px, y], [px, y - h]], { col: tone("ink", 0.55), wid: 0.8, fun: () => 1 }));
    var fw = h * 0.45 * -side; // flags fly towards each other
    var fh = h * 0.32;
    canv.push(...poly([[px, y - h], [px + fw, y - h + 0.5], [px + fw, y - h + fh / 2], [px, y - h + fh / 2]], { fil: tone("flag-red", 0.85), str: tone("ink", 0.4), wid: 0.4 }));
    canv.push(...poly([[px, y - h + fh / 2], [px + fw, y - h + fh / 2], [px + fw, y - h + fh], [px, y - h + fh]], { fil: tone("flag-yellow", 0.85), str: tone("ink", 0.4), wid: 0.4 }));
  }
  return canv;
}

/** A hull like upstream's boat01: a crescent, `len` long. */
function hull(x, y, len, fli) {
  var dir = fli ? -1 : 1;
  var top = [];
  var bot = [];
  for (var i = 0; i <= 10; i++) {
    var u = i / 10;
    var px = x + dir * (u - 0.5) * len;
    top.push([px, y - Math.pow(Math.sin(u * Math.PI), 0.5) * len * 0.02]);
    bot.push([px, y + Math.pow(Math.sin(u * Math.PI), 0.5) * len * 0.1]);
  }
  var canv = [];
  canv.push(...poly(top.concat(bot.slice().reverse()), { fil: body("structure"), str: NONE }));
  canv.push(...stroke(bot, { col: ink(0.45), wid: 1, fun: (t) => Math.sin(t * Math.PI) }));
  canv.push(...stroke(top, { col: ink(0.35), wid: 0.6 }));
  return canv;
}

/** A small sailing boat, usually far out. */
export function sailboat(x, y, args) {
  args = args || {};
  var len = args.len || 30;
  var fli = random() < 0.5;
  var canv = [];
  var mast = len * (0.9 + 0.4 * random());
  var mx = x + (fli ? 1 : -1) * len * 0.05;
  canv.push(...stroke([[mx, y], [mx, y - mast]], { col: ink(0.5), wid: 0.8, fun: () => 1 }));
  var dir = fli ? 1 : -1;
  var sail = [[mx, y - mast], [mx + dir * len * 0.45, y - len * 0.08], [mx, y - len * 0.08]];
  canv.push(...poly(sail, { fil: body("cloth"), str: tone("cloth", 0.45), wid: 0.7 }));
  if (random() < 0.6) {
    var jib = [[mx, y - mast * 0.85], [mx - dir * len * 0.3, y - len * 0.06], [mx, y - len * 0.06]];
    canv.push(...poly(jib, { fil: body("cloth"), str: tone("cloth", 0.4), wid: 0.6 }));
  }
  canv.push(...hull(x, y, len, fli));
  return canv;
}

/** A dinghy with oars. */
export function dinghy(x, y, args) {
  args = args || {};
  var len = args.len || 20;
  var fli = random() < 0.5;
  var canv = hull(x, y, len, fli);
  for (var side of [-1, 1]) {
    canv.push(...stroke([[x + side * len * 0.1, y - 1], [x + side * len * 0.5, y + len * 0.15]], { col: ink(0.45), wid: 0.6, fun: () => 1 }));
  }
  return canv;
}
