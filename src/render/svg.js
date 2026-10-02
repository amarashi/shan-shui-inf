// Display list to SVG markup. With the ink palette the output is character for character
// what upstream's poly() and roof() sign produced.
import { ink } from "./palette.js";

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

function polyline(r, p) {
  var canv = "<polyline points='";
  for (var i = 0; i < r.pts.length; i++) {
    canv += " " + r.pts[i][0].toFixed(1) + "," + r.pts[i][1].toFixed(1);
  }
  return canv + "' style='fill:" + p.paint(r.fill) + ";stroke:" + p.paint(r.stroke) + ";stroke-width:" + r.width + "'/>";
}

function text(r, p) {
  return (
    "<text font-size='" +
    r.size +
    "' font-family='Verdana' style='fill:" +
    p.paint(r.fill) +
    "' text-anchor='middle' transform='translate(" +
    r.x +
    "," +
    r.y +
    ") rotate(" +
    r.rot +
    ")'>" +
    esc(r.text) +
    "</text>"
  );
}

/**
 * @param {object[]} list display list
 * @param {{paint: (c: object) => string}} [palette] defaults to ink (the upstream look)
 * @returns {string} SVG markup (no <svg> wrapper)
 */
export function toSVG(list, palette = ink) {
  var out = "";
  for (var i = 0; i < list.length; i++) {
    out += list[i].type === "text" ? text(list[i], palette) : polyline(list[i], palette);
  }
  return out;
}
