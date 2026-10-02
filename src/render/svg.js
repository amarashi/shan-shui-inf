// Display list to SVG markup. The output is character for character what upstream's
// poly() and roof() sign produced.

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

function polyline(r) {
  var canv = "<polyline points='";
  for (var i = 0; i < r.pts.length; i++) {
    canv += " " + r.pts[i][0].toFixed(1) + "," + r.pts[i][1].toFixed(1);
  }
  return canv + "' style='fill:" + r.fill + ";stroke:" + r.stroke + ";stroke-width:" + r.width + "'/>";
}

function text(r) {
  return (
    "<text font-size='" +
    r.size +
    "' font-family='Verdana' style='fill:" +
    r.fill +
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

/** @param {object[]} list display list @returns {string} SVG markup (no <svg> wrapper) */
export function toSVG(list) {
  var out = "";
  for (var i = 0; i < list.length; i++) {
    out += list[i].type === "text" ? text(list[i]) : polyline(list[i]);
  }
  return out;
}
