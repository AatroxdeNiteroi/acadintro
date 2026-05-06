/* ═══════════════════════════════════════════════════════════
   NEURAL.GYM — Avatar icon canvas drawers.

   Uses professional silhouettes from game-icons.net (CC-BY 3.0)
   rendered to canvas via Path2D for crisp, high-quality results.

   Source icons (all 512×512 viewBox):
   • aatrox — lorc/daemon-skull       (horned demon cranium — Darkin)
   • druid  — lorc/wolf-head          (snarling wolf, wildshape)
   • kratos — delapouite/spartan-helmet  (Ghost of Sparta helm)
   • gun    — lorc/punch              (striking fist with motion lines)
   • ichigo — lorc/saber-slash        (crescent slash — Getsuga Tenshou)

   Attribution: Lorc & Delapouite via https://game-icons.net (CC-BY 3.0).
   ═══════════════════════════════════════════════════════════ */

import { SVG_PATHS } from './iconPaths.js';

// Layered post-drawers (e.g. tinted highlights). Currently none — silhouettes
// are clean enough on their own.
const POST_DRAWERS = {};

export function makeIconCanvas(ns, color, color2 = '#ffffff', size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const pathStr = SVG_PATHS[ns];
  if (!pathStr) return c;

  // game-icons SVGs use a 512×512 viewBox — scale to fit our canvas
  const scale = size / 512;
  ctx.save();
  ctx.scale(scale, scale);

  const path = new Path2D(pathStr);
  ctx.fillStyle = color;
  ctx.fill(path, 'evenodd');
  ctx.restore();

  // Optional layered detail
  const post = POST_DRAWERS[ns];
  if (post) post(ctx, size, color, color2);

  return c;
}
