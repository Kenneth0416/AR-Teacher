// Shared scene kit. Scenes receive it as ctx.kit (or may `import * as kit from '../kit/index.js'`).
export { palette, seriesColors } from './palette.js';
export { createLightingRig } from './lighting.js';
export { rng, toColor, disposeObject, setOpacity, roundedRectShape, v3 } from './util.js';
export { Label, label, fmt, chem, sup, sub, FONT_STACK } from './text.js';
export { Ribbon, densify } from './lines.js';
export { Graph2D } from './graph2d.js';
export { ParticleBox } from './particles.js';
export { Vessel, Beaker, TestTube, ConicalFlask, Bubbles, GasSyringe } from './glassware.js';
export { Arrow, HighlightRect, Panel } from './primitives.js';
export {
  clamp, lerp, invLerp, remap, smoothstep, ease, loop, pingpong, tween, envelope,
  totalDuration, stepAt, timeline, captionTrack,
} from './timeline.js';
