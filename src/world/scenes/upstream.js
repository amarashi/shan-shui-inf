// The upstream scene: {Shan, Shui}*'s mountains, trees, boats and pavilions.
import { LAYERS } from "../layers.js";
import { createPlanner, REACH } from "../plan.js";

export const upstream = {
  name: "upstream",
  // upstream's calcViewBox zoom: the view shows 2627 x 700 of the 3000 x 800 world
  zoom: 1.142,
  // a part is drawn if its record x is within this of the view (upstream: one chunk width)
  margin: 512,
  // furthest a record lands from its own chunk
  reach: REACH,
  layers: LAYERS,
  context: (seed) => ({ planner: createPlanner(seed) }),
  plan: (k, ctx) => ctx.planner.plan(k),
  forget: (ctx, kmin, kmax) => ctx.planner.forget(kmin, kmax),
};
