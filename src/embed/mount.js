// mount(element, options): put a living coastal painting into any element (PLAN.md Phase 6).
//
//   const scene = mount(el, { seed: "any string", mode: "drift", height: 400 });
//   scene.reseed();            // a new painting (random seed), or reseed("abc")
//   scene.destroy();
//
// Options
//   seed    string; default random
//   mode    "static" | "scroll" (drag, wheel, arrow keys) | "drift" (slow auto-scroll)
//   height  pixels; default 400. Width follows the element.
//   scene   "coast" (default) | "upstream" (the original {Shan, Shui}* landscape)
//   speed   drift speed in world units per second; default 18
//   label   accessible description; default describes the painting
//
// Safe to mount more than once per page: no globals, styles scoped in a shadow root, one
// worker per instance. Generation runs in the worker; a paper-coloured placeholder shows
// until the first view and the paper are ready, then the painting fades in. Drift pauses
// off screen and in hidden tabs, has a visible pause button, and turns into "static" when
// the visitor prefers reduced motion.
import { SCENE_VIEW, WINDY } from "../world/view.js";
import { createScroller } from "./scroller.js";

const PAPER = "#f2ebdc";
const SVG_NS = "http://www.w3.org/2000/svg";

const STYLE = `
:host { display: block; position: relative; overflow: hidden; isolation: isolate; background: ${PAPER}; contain: content; }
.paper { position: absolute; inset: 0; background-color: ${PAPER}; background-size: 512px; }
svg { position: absolute; inset: 0; width: 100%; height: 100%; mix-blend-mode: multiply; opacity: 0; transition: opacity 0.9s ease; touch-action: pan-y; }
svg.ready { opacity: 1; }
:host(:focus-visible) { outline: 2px solid #222; outline-offset: -2px; }
button { position: absolute; right: 10px; bottom: 10px; font: 12px/1 system-ui, sans-serif; padding: 6px 10px;
  border: 1px solid rgba(0,0,0,0.35); background: rgba(255,255,255,0.75); color: #222; border-radius: 3px; cursor: pointer; }
button:focus-visible { outline: 2px solid #222; outline-offset: 2px; }
button[hidden] { display: none; }
@media (prefers-reduced-motion: reduce) { svg { transition: none; } }
`;

function randomSeed() {
  // Seeds only choose the painting; any value works. crypto when available.
  var a = new Uint32Array(2);
  if (globalThis.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
  else a[0] = Date.now();
  return (a[0].toString(36) + a[1].toString(36)).slice(0, 10);
}

/**
 * @param {HTMLElement} el
 * @param {{seed?: string, mode?: "static"|"scroll"|"drift", height?: number,
 *   scene?: "coast"|"upstream", speed?: number, label?: string, x?: number}} [options]
 */
export function mount(el, options) {
  var o = Object.assign({ mode: "static", height: 400, scene: "coast", speed: 18 }, options || {});
  var seed = o.seed != null ? String(o.seed) : randomSeed();
  var scene = SCENE_VIEW[o.scene];
  if (!scene) throw new Error("unknown scene " + o.scene);

  var host = document.createElement("div");
  host.style.height = o.height + "px";
  el.appendChild(host);
  var root = host.attachShadow({ mode: "open" });
  root.innerHTML =
    "<style>" + STYLE + "</style>" +
    '<div class="paper" part="paper"></div>' +
    '<svg xmlns="' + SVG_NS + '" role="img" part="painting" preserveAspectRatio="xMinYMid slice"><title></title><g></g></svg>' +
    '<button type="button" part="pause" hidden aria-pressed="false">Pause</button>';
  var paperEl = root.querySelector(".paper");
  var svg = root.querySelector("svg");
  var group = root.querySelector("g");
  var title = root.querySelector("title");
  var button = root.querySelector("button");

  var worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  var scroller = null;
  var x = o.x || 0;
  var viewH = WINDY / scene.zoom; // world units shown top to bottom
  var viewW = viewH * 3.75;
  var destroyed = false;

  var reduce = globalThis.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  var drifting = false;
  var paused = false;
  var visible = true;
  var raf = 0;
  var last = 0;
  var lastLoad = x;

  function describe() {
    var text = o.label || (scene.name === "coast"
      ? "Ink drawing of an Australian coastline: sea, surf, beaches and sandstone headlands (seed " + seed + ")"
      : "Ink drawing of a Chinese landscape in the style of a shan shui scroll (seed " + seed + ")");
    title.textContent = text;
    svg.setAttribute("aria-label", text);
  }

  function setViewBox() {
    svg.setAttribute("viewBox", x + " 0 " + viewW + " " + viewH);
  }

  function measure() {
    var r = host.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) viewW = (viewH * r.width) / r.height;
  }

  function start() {
    svg.classList.remove("ready");
    describe();
    measure();
    setViewBox();
    if (scroller) scroller.destroy();
    scroller = createScroller({ group: group, worker: worker, seed: seed, scene: scene.name, palette: "ink", width: viewW });
    var s = scroller;
    var shown = s.scrollTo(x);
    var paper = s.paper().then(function (px) {
      var c = document.createElement("canvas");
      c.width = px.width;
      c.height = px.height;
      c.getContext("2d").putImageData(new ImageData(px.data, px.width, px.height), 0, 0);
      paperEl.style.backgroundImage = "url(" + c.toDataURL("image/png") + ")";
    });
    return Promise.all([shown, paper]).then(function () {
      if (!destroyed && s === scroller) svg.classList.add("ready");
    });
  }

  // --- scrolling ---------------------------------------------------------------------
  function moveTo(nx) {
    x = nx;
    setViewBox();
    // ask for new chunks only every 60 units: the scroller keeps a margin loaded
    if (Math.abs(x - lastLoad) > 60) {
      lastLoad = x;
      scroller.scrollTo(x);
    }
  }
  function pxToWorld(dpx) {
    var r = host.getBoundingClientRect();
    return (dpx * viewW) / Math.max(1, r.width);
  }

  var dragFrom = null;
  function onDown(e) {
    dragFrom = { px: e.clientX, x: x };
    host.setPointerCapture(e.pointerId);
  }
  function onMove(e) {
    if (dragFrom) moveTo(dragFrom.x - pxToWorld(e.clientX - dragFrom.px));
  }
  function onUp() {
    dragFrom = null;
    scroller.scrollTo(x);
  }
  function onWheel(e) {
    var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (!d) return; // let vertical wheel scroll the page
    e.preventDefault();
    moveTo(x + pxToWorld(d));
  }
  function onKey(e) {
    var step = viewW * 0.1;
    if (e.key === "ArrowRight") moveTo(x + step);
    else if (e.key === "ArrowLeft") moveTo(x - step);
    else return;
    e.preventDefault();
  }
  if (o.mode === "scroll") {
    host.tabIndex = 0;
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    host.addEventListener("wheel", onWheel, { passive: false });
    host.addEventListener("keydown", onKey);
  }

  // --- drift -------------------------------------------------------------------------
  function frame(t) {
    raf = 0;
    if (!drifting || paused || !visible || document.hidden) return;
    var dt = last ? Math.min(0.1, (t - last) / 1000) : 0;
    last = t;
    moveTo(x + o.speed * dt);
    raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (!raf && drifting && !paused && visible && !document.hidden) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }
  function updateDrift() {
    drifting = o.mode === "drift" && !(reduce && reduce.matches);
    button.hidden = !drifting;
    if (drifting) kick();
  }
  function togglePause() {
    paused = !paused;
    button.textContent = paused ? "Play" : "Pause";
    button.setAttribute("aria-pressed", String(paused));
    kick();
  }
  button.addEventListener("click", togglePause);
  if (reduce && reduce.addEventListener) reduce.addEventListener("change", updateDrift);
  document.addEventListener("visibilitychange", kick);
  var io = globalThis.IntersectionObserver
    ? new IntersectionObserver(function (entries) {
        visible = entries[entries.length - 1].isIntersecting;
        kick();
      })
    : null;
  if (io) io.observe(host);
  var ro = globalThis.ResizeObserver
    ? new ResizeObserver(function () {
        measure();
        setViewBox();
        if (scroller) scroller.setWidth(viewW);
      })
    : null;
  if (ro) ro.observe(host);

  // If the worker cannot load (a wrong URL, a strict Content Security Policy), say so
  // instead of waiting forever.
  var failed = new Promise(function (resolve, reject) {
    worker.addEventListener("error", function (e) {
      var err = new Error("coast-inf: the painting worker failed to load" + (e && e.message ? ": " + e.message : ""));
      console.error(err);
      reject(err);
    });
  });
  var ready = Promise.race([start(), failed]);
  updateDrift();

  return {
    /** Resolves when the first painting is visible. */
    ready: ready,
    get seed() {
      return seed;
    },
    get x() {
      return x;
    },
    /** A new painting: the given seed, or a random one. Resolves when it is visible. */
    reseed: function (s) {
      seed = s != null ? String(s) : randomSeed();
      x = o.x || 0;
      lastLoad = x;
      return start();
    },
    /** Move the view to world x. Resolves when the view is complete. */
    scrollTo: function (nx) {
      moveTo(nx);
      return scroller.scrollTo(x);
    },
    pause: function () {
      if (!paused) togglePause();
    },
    play: function () {
      if (paused) togglePause();
    },
    /** The painting currently on screen, as a standalone SVG document. */
    toSVG: function () {
      var clone = svg.cloneNode(true);
      clone.removeAttribute("class");
      clone.setAttribute("width", Math.round((viewW * 800) / viewH));
      clone.setAttribute("height", 800);
      var rect = document.createElementNS(SVG_NS, "rect");
      clone.insertBefore(rect, clone.querySelector("g"));
      rect.setAttribute("x", x);
      rect.setAttribute("y", 0);
      rect.setAttribute("width", viewW);
      rect.setAttribute("height", viewH);
      rect.setAttribute("fill", PAPER);
      return new XMLSerializer().serializeToString(clone);
    },
    destroy: function () {
      destroyed = true;
      drifting = false;
      if (raf) cancelAnimationFrame(raf);
      if (io) io.disconnect();
      if (ro) ro.disconnect();
      if (reduce && reduce.removeEventListener) reduce.removeEventListener("change", updateDrift);
      document.removeEventListener("visibilitychange", kick);
      if (scroller) scroller.destroy();
      worker.terminate();
      host.remove();
    },
  };
}
