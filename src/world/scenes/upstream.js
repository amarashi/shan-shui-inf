// The upstream scene: {Shan, Shui}*'s mountains, trees, boats and pavilions.
import { LAYERS } from "../layers.js";
import { createPlanner } from "../plan.js";
import { SCENE_VIEW } from "../view.js";

// zoom, margin and reach are in src/world/view.js (SCENE_VIEW), shared with the page side.
export const upstream = {
  ...SCENE_VIEW.upstream,
  layers: LAYERS,
  context: (seed) => ({ planner: createPlanner(seed) }),
  plan: (k, ctx) => ctx.planner.plan(k),
  forget: (ctx, kmin, kmax) => ctx.planner.forget(kmin, kmax),
};
