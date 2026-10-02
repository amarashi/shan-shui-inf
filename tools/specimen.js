// Specimen sheet: 12 variations of one element on a 4 x 3 grid, modelled on upstream's
// `dummyloader`. Each cell reseeds the generator with "<name>:<i>", so a cell can be
// reproduced on its own.
//
//   pnpm specimen tree04
//   pnpm specimen --list
//   pnpm specimen sea --guides            coast layer strips, with the coast model drawn in red
//   pnpm specimen coast --layers sea,surf --count 4
//   pnpm specimen waterline --count 1 --x 1200 --w 1000 --y 300   zoom into a bay
//
// Output: out/specimen-<name>.png
import { mkdirSync } from "node:fs";
import { parseArgs } from "node:util";
import { createNoise, withNoise } from "../src/noise.js";
import { palettes } from "../src/render/palette.js";
import { toSVG } from "../src/render/svg.js";
import { stream, withRandom } from "../src/rng.js";
import { createWorld, WINDX, WINDY } from "../src/world/chunks.js";
import { ENGINE_ELEMENTS } from "./lib/specimens.js";
import "./lib/specimens-all.js";
import { paperDataUrl } from "./lib/paper.js";
import { launch, openUpstream } from "./lib/upstream.js";

// at: where the element is drawn, default [0, 0]. Landforms use a realistic y, because
//   upstream shapes depend on it (Mount.mountain adds random * yoff / 100 per layer).
// box: the cell's view in world units [x, y, width, height].
// draw: source of a function (x, y, i) => SVG markup, evaluated inside the upstream page.
// Arguments mirror how upstream itself calls each element (mountplanner, chunkloader,
// Mount.mountain's vegetate calls, Mount.flatDec).
export const ELEMENTS = {
  tree01: { box: [-60, -110, 120, 120], draw: "(x,y)=>Tree.tree01(x,y,{hei:30+Math.random()*60,wid:Math.random()*3+1,col:'rgba(100,100,100,0.4)'})" },
  tree02: { box: [-50, -60, 100, 90], draw: "(x,y)=>Tree.tree02(x,y,{col:'rgba(100,100,100,0.6)'})" },
  tree03: { box: [-90, -150, 180, 170], draw: "(x,y)=>Tree.tree03(x,y,{hei:60+Math.random()*60,col:'rgba(100,100,100,0.4)'})" },
  tree04: { box: [-240, -380, 480, 400], draw: "(x,y)=>Tree.tree04(x,y,{})" },
  tree05: { box: [-170, -330, 340, 350], draw: "(x,y)=>Tree.tree05(x,y,{hei:100+Math.random()*200})" },
  tree06: { box: [-130, -170, 260, 190], draw: "(x,y)=>Tree.tree06(x,y,{hei:60+Math.random()*60})" },
  tree07: { box: [-60, -100, 120, 110], draw: "(x,y)=>Tree.tree07(x,y,{hei:normRand(40,80)})" },
  tree08: { box: [-110, -150, 220, 170], draw: "(x,y)=>Tree.tree08(x,y,{hei:60+Math.random()*40})" },
  mountain: { at: [0, 450], box: [-380, 60, 760, 460], draw: "(x,y,i)=>Mount.mountain(x,y,i*2*Math.random())" },
  flatMount: {
    at: [0, 650],
    box: [-550, 260, 1100, 480],
    draw: "(x,y)=>Mount.flatMount(x,y,2*Math.random()*Math.PI,{wid:600+Math.random()*400,hei:100,cho:0.5+Math.random()*0.2})",
  },
  distMount: { at: [0, 260], box: [-50, 90, 1600, 220], draw: "(x,y)=>Mount.distMount(x,y,Math.random()*100,{hei:150,len:randChoice([500,1000,1500])})" },
  rock: { box: [-120, -90, 240, 130], draw: "(x,y)=>Mount.rock(x,y,Math.random()*100,{wid:50+Math.random()*20,hei:40+Math.random()*20,sha:5})" },
  water: { at: [0, 450], box: [-450, 410, 900, 90], draw: "(x,y,i)=>water(x,y,i*2)" },
  arch01: { box: [-150, -140, 300, 170], draw: "(x,y)=>Arch.arch01(x,y,Math.random(),{wid:normRand(160,200),hei:normRand(80,100),per:Math.random()})" },
  arch02: {
    box: [-70, -110, 140, 130],
    draw: "(x,y,i)=>Arch.arch02(x,y,i,{wid:normRand(40,70),sto:randChoice([1,2,2,3]),rot:Math.random(),sty:randChoice([1,2,3])})",
  },
  arch03: { box: [-60, -160, 120, 175], draw: "(x,y,i)=>Arch.arch03(x,y,i,{sto:randChoice([5,7]),wid:40+Math.random()*20})" },
  arch04: { box: [-40, -60, 80, 75], draw: "(x,y,i)=>Arch.arch04(x,y,i,{sto:randChoice([1,1,1,2,2])})" },
  boat01: { box: [-110, -50, 220, 70], draw: "(x,y)=>Arch.boat01(x,y,Math.random(),{sca:0.4+Math.random()*0.5,fli:randChoice([true,false])})" },
  transmissionTower01: { box: [-50, -110, 100, 120], draw: "(x,y,i)=>Arch.transmissionTower01(x,y,i)" },
  man: { box: [-40, -60, 80, 72], draw: "(x,y)=>Man.man(x,y,{fli:randChoice([true,false]),sca:0.42})" },
};


// Coast layers, drawn by the engine in Node: a strip of the coast scene with only some
// layers. `layers` null means every layer.
const COAST = {
  coast: { layers: null },
  sky: { layers: ["sky"] },
  far: { layers: ["far"] },
  sea: { layers: ["sea"] },
  stacks: { layers: ["stacks"] },
  surf: { layers: ["surf"] },
  swash: { layers: ["swash"] },
  beach: { layers: ["beach"] },
  headland: { layers: ["headland"] },
  waterline: { layers: ["sea", "surf", "swash"] },
  shore: { layers: ["sea", "surf", "swash", "beach"] },
};

const COLS = 4;
const COUNT = 12;
const CELL_PX = 520;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    list: { type: "boolean" },
    seed: { type: "string", default: "specimen" },
    layers: { type: "string" }, // comma-separated, overrides a coast entry's layers
    guides: { type: "boolean" }, // draw the coast model's horizon, shore and dune lines
    x: { type: "string", default: "0" }, // coast strips start here
    w: { type: "string" }, // zoom: show this many world units across (default the whole view)
    y: { type: "string", default: "0" }, // top of the zoomed view
    count: { type: "string", default: String(COUNT) },
    palette: { type: "string", default: "ink" },
  },
});
const name = positionals[0];
const all = () =>
  `upstream elements: ${Object.keys(ELEMENTS).join(", ")}\nengine elements: ${Object.keys(ENGINE_ELEMENTS).join(", ")}\ncoast layers: ${Object.keys(COAST).join(", ")}`;
if (values.list || !name) {
  console.log(all());
  process.exit(values.list ? 0 : 2);
}
if (!ELEMENTS[name] && !COAST[name] && !ENGINE_ELEMENTS[name]) {
  console.error(`"${name}" is not available yet.\n${all()}`);
  process.exit(2);
}
mkdirSync(new URL("../out/", import.meta.url), { recursive: true });
const out = `out/specimen-${name}${values.layers ? "-" + values.layers.replaceAll(",", "+") : ""}${values.palette !== "ink" ? "-" + values.palette : ""}.png`;
const browser = await launch();

const palette = palettes[values.palette];

if (ENGINE_ELEMENTS[name]) {
  const el = ENGINE_ELEMENTS[name];
  const [bx, by, bw, bh] = el.box;
  const count = Number(values.count);
  const cellH = Math.round((CELL_PX * bh) / bw);
  const labelH = 24;
  const rows = Math.ceil(count / COLS);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${COLS * CELL_PX}" height="${rows * (cellH + labelH)}" style="display:block">`;
  const noise = createNoise(stream(name, "noise"));
  for (let i = 0; i < count; i++) {
    const list = withNoise(noise, () => withRandom(stream(name, i), () => el.draw(...(el.at ?? [0, 0]), i)));
    const cx = (i % COLS) * CELL_PX;
    const cy = Math.floor(i / COLS) * (cellH + labelH);
    svg +=
      `<text x="${cx + 6}" y="${cy + 17}" font-family="sans-serif" font-size="14" fill="#555">${name}:${i}</text>` +
      `<rect x="${cx + 0.5}" y="${cy + labelH + 0.5}" width="${CELL_PX - 1}" height="${cellH - 1}" fill="none" stroke="rgba(0,0,0,0.12)"/>` +
      `<svg x="${cx}" y="${cy + labelH}" width="${CELL_PX}" height="${cellH}" viewBox="${bx} ${by} ${bw} ${bh}" style="mix-blend-mode:multiply">` +
      toSVG(list, palette) +
      `</svg>`;
  }
  svg += "</svg>";
  const page = await browser.newPage({ viewport: { width: COLS * CELL_PX + 20, height: 900 } });
  await page.setContent(
    `<body style="margin:0;background:url(${await paperDataUrl("paper", palette.paper)})"><div id="SPEC" style="display:inline-block">${svg}</div></body>`,
  );
  await page.locator("#SPEC").screenshot({ path: out });
} else if (ELEMENTS[name]) {
  const el = ELEMENTS[name];
  // The page seed fixes the Noise table, which upstream fills on first use and never reseeds.
  const page = await openUpstream(browser, values.seed);
  await page.evaluate(
    ({ name, el, COLS, COUNT, CELL_PX }) => {
      const draw = (0, eval)(el.draw);
      const [bx, by, bw, bh] = el.box;
      const cellH = Math.round((CELL_PX * bh) / bw);
      const labelH = 24;
      const rows = Math.ceil(COUNT / COLS);
      const W = COLS * CELL_PX;
      const H = rows * (cellH + labelH);
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="mix-blend-mode:multiply;display:block">`;
      for (let i = 0; i < COUNT; i++) {
        Math.seed(`${name}:${i}`);
        const cx = (i % COLS) * CELL_PX;
        const cy = Math.floor(i / COLS) * (cellH + labelH);
        svg +=
          `<text x="${cx + 6}" y="${cy + 17}" font-family="sans-serif" font-size="14" fill="#555">${name}:${i}</text>` +
          `<rect x="${cx + 0.5}" y="${cy + labelH + 0.5}" width="${CELL_PX - 1}" height="${cellH - 1}" fill="none" stroke="rgba(0,0,0,0.12)"/>` +
          `<svg x="${cx}" y="${cy + labelH}" width="${CELL_PX}" height="${cellH}" viewBox="${bx} ${by} ${bw} ${bh}">` +
          draw(...(el.at ?? [0, 0]), i) +
          `</svg>`;
      }
      svg += "</svg>";
      document.body.innerHTML = `<div id="SPEC" style="display:inline-block">${svg}</div>`;
    },
    { name, el, COLS, COUNT, CELL_PX },
  );
  await page.locator("#SPEC").screenshot({ path: out });
} else {
  const layers = values.layers ? values.layers.split(",") : COAST[name].layers;
  const count = Number(values.count);
  const cols = Math.min(COLS, count);
  const x0 = Number(values.x);
  const cellW = cols === 1 ? 2000 : CELL_PX * 2; // coast strips are wide; 2 columns read better
  const ncols = cols === 1 ? 1 : 2;
  const cellH = Math.round((cellW * WINDY) / WINDX);
  const labelH = 24;
  const rows = Math.ceil(count / ncols);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ncols * cellW}" height="${rows * (cellH + labelH)}" style="display:block">`;
  for (let i = 0; i < count; i++) {
    const seed = `${name}:${i}`;
    const world = createWorld({ seed, scene: "coast", layers: layers ?? undefined, palette });
    world.MEM.cursx = x0;
    world.update();
    let guides = "";
    if (values.guides) {
      const c = world.context.coast;
      const line = (f) =>
        Array.from({ length: 151 }, (_, j) => x0 + (j * WINDX) / 150)
          .map((x) => `${x.toFixed(1)},${f(x).toFixed(1)}`)
          .join(" ");
      const seams = c
        .segmentsIn(x0, x0 + WINDX)
        .map((s) => `<line x1="${s.x0}" y1="0" x2="${s.x0}" y2="${WINDY}" stroke="rgba(0,0,255,0.35)" stroke-width="2" stroke-dasharray="8 8"/>`)
        .join("");
      guides =
        seams +
        `<polyline points="${line(() => c.yh)}" fill="none" stroke="rgba(255,0,0,0.5)" stroke-width="2"/>` +
        `<polyline points="${line(c.shore)}" fill="none" stroke="rgba(255,0,0,0.6)" stroke-width="2"/>` +
        `<polyline points="${line(c.dune)}" fill="none" stroke="rgba(255,0,0,0.35)" stroke-width="2"/>`;
    }
    const vw = values.w ? Number(values.w) : null;
    const vb = vw ? `${x0} ${values.y} ${vw} ${(vw * WINDY) / WINDX}` : world.calcViewBox();
    const cx = (i % ncols) * cellW;
    const cy = Math.floor(i / ncols) * (cellH + labelH);
    svg +=
      `<text x="${cx + 6}" y="${cy + 17}" font-family="sans-serif" font-size="14" fill="#555">${seed}  layers: ${layers ? layers.join(", ") : "all"}</text>` +
      `<svg x="${cx}" y="${cy + labelH}" width="${cellW}" height="${cellH}" viewBox="${vb}" style="mix-blend-mode:multiply">` +
      world.MEM.canv +
      guides +
      `</svg>` +
      `<rect x="${cx + 0.5}" y="${cy + labelH + 0.5}" width="${cellW - 1}" height="${cellH - 1}" fill="none" stroke="rgba(0,0,0,0.12)"/>`;
  }
  svg += "</svg>";
  const page = await browser.newPage({ viewport: { width: ncols * cellW + 20, height: 900 } });
  await page.setContent(
    `<body style="margin:0;background:url(${await paperDataUrl("paper", palette.paper)})"><div id="SPEC" style="display:inline-block">${svg}</div></body>`,
  );
  await page.locator("#SPEC").screenshot({ path: out });
}
await browser.close();
console.log(`wrote ${out}`);
