// Primitives as data. Every element returns a display list: an array of records that
// render/svg.js (and later other back ends) turns into output.
//
//   { type: "poly", pts: [[x, y], ...], fill, stroke, width }
//   { type: "text", x, y, size, rot, text, fill }
//
// fill and stroke are colours from render/palette.js (tone, body, NONE, CLEAR), each with
// its own role, because a shape's body and its outline are often different things.
//
// Upstream drew everything through poly(), which returned a <polyline> string. This poly()
// takes the same arguments and returns a one-record list instead.
import { CLEAR } from "./palette.js";

export function poly(plist, args) {
  var args = args != undefined ? args : {};
  var xof = args.xof != undefined ? args.xof : 0;
  var yof = args.yof != undefined ? args.yof : 0;
  var fil = args.fil != undefined ? args.fil : CLEAR;
  var str = args.str != undefined ? args.str : fil;
  var wid = args.wid != undefined ? args.wid : 0;

  var pts = new Array(plist.length);
  for (var i = 0; i < plist.length; i++) {
    pts[i] = [plist[i][0] + xof, plist[i][1] + yof];
  }
  return [{ type: "poly", pts: pts, fill: fil, stroke: str, width: wid }];
}

/** A line of text centred on (x, y), rotated by `rot` degrees. */
export function text(x, y, args) {
  return [{ type: "text", x: x, y: y, size: args.size, rot: args.rot, text: args.text, fill: args.fill }];
}
