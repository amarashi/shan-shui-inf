// renderToSVG: a painting as standalone SVG markup, with no DOM needed (Node, workers,
// servers, build steps).
//
//   renderToSVG({ seed: "abc", x0: 0, x1: 3000 })
import { createWorld, WINDY } from "../world/chunks.js";
import { SCENES } from "../world/scenes/index.js";

const PAPER = "#f2ebdc";

/**
 * @param {{seed: string, x0?: number, x1?: number, scene?: "coast"|"upstream",
 *   background?: string|null, label?: string}} opts
 *   background: fill behind the painting (default a paper colour; null for none)
 * @returns {string} SVG markup, ready to save as an .svg file
 */
export function renderToSVG(opts) {
  var x0 = opts.x0 != null ? opts.x0 : 0;
  var x1 = opts.x1 != null ? opts.x1 : 3000;
  var sceneName = opts.scene || "coast";
  var h = WINDY / SCENES[sceneName].zoom;
  var w = x1 - x0;
  var world = createWorld({ seed: String(opts.seed), scene: sceneName });
  world.MEM.windx = w;
  world.MEM.cursx = x0;
  world.update();
  var label = (opts.label || "Ink drawing of an Australian coastline (seed " + opts.seed + ")").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  var bg = opts.background === undefined ? PAPER : opts.background;
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + x0 + " 0 " + w + " " + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + label + '">' +
    "<title>" + label + "</title>" +
    (bg ? '<rect x="' + x0 + '" y="0" width="' + w + '" height="' + h + '" fill="' + bg + '"/>' : "") +
    "<g>" + world.MEM.canv + "</g></svg>"
  );
}
