// Upstream's page scripts and UI, on the new engine in src/. Until Phase 2 step 3 this page
// reproduced upstream byte for byte; since then each chunk has its own random streams, so
// the same seed gives a different (but scroll-order independent) world from upstream's.
// Since step 7, chunks and the paper texture are generated in a Web Worker; this script
// only inserts markup. Serve with Vite (pnpm dev), which resolves the worker's imports.
import { createScroller } from "../src/embed/scroller.js";
import { palettes } from "../src/render/palette.js";
import { WINDX, WINDY } from "../src/world/chunks.js";

// --- seed (upstream parseArgs: the raw text after "seed=", not URL-decoded) ---
// Also ?palette=<name> (not in upstream): ink (default) or roles.
var SEED = "" + new Date().getTime();
var PALETTE = "ink";
var par = window.location.href.split("?")[1];
if (par != undefined) {
  par.split("&").forEach(function (kv) {
    var e = kv.split("=");
    if (e[0] == "seed") SEED = e[1] == "" ? SEED : e[1];
    if (e[0] == "palette" && palettes[e[1]]) PALETTE = e[1];
  });
}
// --- the world: generated in a worker, synced into one <svg> created once ---
document.getElementById("BG").innerHTML =
  "<svg id='SVG' xmlns='http://www.w3.org/2000/svg' width='" +
  WINDX +
  "' height='" +
  WINDY +
  "' style='mix-blend-mode:multiply;'><g id='G'></g></svg>";
const worker = new Worker(new URL("../src/embed/worker.js", import.meta.url), { type: "module" });
const scroller = createScroller({
  group: document.getElementById("G"),
  worker: worker,
  seed: SEED,
  palette: PALETTE,
  onViewBox: (vb) => document.getElementById("SVG").setAttribute("viewBox", vb),
});

// --- upstream xcroll() and UI helpers ---
/** Scroll by v world units; resolves when the new view is complete. */
function xcroll(v) {
  return scroller.scrollBy(v);
}
function autoxcroll(v) {
  if (document.getElementById("AUTO_SCROLL").checked) {
    xcroll(v);
    setTimeout(function () {
      autoxcroll(v);
    }, 2000);
  }
}
function rstyle(id, b) {
  var a = b ? 0.1 : 0.0;
  document.getElementById(id).setAttribute(
    "style",
    "width: 32px; text-align: center; top: 0px; color:rgba(0,0,0,0.4); display:table;" +
      " cursor: pointer; border: 1px solid rgba(0,0,0,0.4); background-color:rgba(0,0,0," +
      a +
      "); height:" +
      WINDY +
      "px",
  );
  document.getElementById(id + ".t").setAttribute("style", "vertical-align:middle; display:table-cell");
}
function toggleVisible(id) {
  var v = document.getElementById(id).style.display == "none";
  document.getElementById(id).style.display = v ? "block" : "none";
}
function toggleText(id, a, b) {
  var v = document.getElementById(id).innerHTML;
  document.getElementById(id).innerHTML = v == "" || v == b ? a : b;
}
var lastScrollX = 0;
var pFrame = 0;
function present() {
  var currScrollX = window.scrollX;
  var step = 1;
  document.body.scrollTo(Math.max(0, pFrame - 10), window.scrollY);
  pFrame += step;
  if (pFrame < 20 || Math.abs(lastScrollX - currScrollX) < step * 2) {
    lastScrollX = currScrollX;
    setTimeout(present, 1);
  }
}
function reloadWSeed(s) {
  var u = window.location.href.split("?")[0];
  window.location.href = u + "?seed=" + s;
}
function downloadSvg() {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(document.getElementById("BG").innerHTML),
  );
  element.setAttribute("download", "shanshui-" + SEED + ".svg");
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// The markup uses inline handlers, so these are global. Tools also call xcroll and read
// scroller.visible().
Object.assign(window, {
  scroller,
  xcroll,
  autoxcroll,
  rstyle,
  toggleVisible,
  toggleText,
  reloadWSeed,
  downloadSvg,
  btnHoverCol: "rgba(0,0,0,0.1)",
});

for (const id of ["SETTING", "SOURCE_BTN"]) {
  const left = id == "SETTING" ? [4, 40] : [41, 77];
  window.addEventListener("scroll", function () {
    document.getElementById(id).style.left = Math.max(left[0], left[1] - window.scrollX) + "px";
  });
}
rstyle("L", false);
rstyle("R", false);

// --- first screen (upstream's inline script inside #BG) ---
document.getElementById("INP_SEED").value = SEED;
document.getElementById("BG").setAttribute("style", "width:" + WINDX + "px");
document.body.scrollTo(0, 0);
present();

// --- paper texture (upstream's last script), drawn in the worker ---
const paperDone = scroller.paper().then(function (px) {
  var canvas = document.getElementById("bgcanv");
  canvas.getContext("2d").putImageData(new ImageData(px.data, px.width, px.height), 0, 0);
  var img = canvas.toDataURL("image/png");
  document.getElementById("BG").style.backgroundImage = "url(" + img + ")";
  document.body.style.backgroundImage = "url(" + img + ")";
});

// Resolves when the first screen and the paper are complete (tools wait on this).
window.shanshuiReady = Promise.all([scroller.ready, paperDone]);
