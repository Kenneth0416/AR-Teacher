# Scene contract (for authors of `src/scenes/page-XX.js`)

One ES module per textbook page: `src/scenes/page-01.js` … `src/scenes/page-10.js`. The runtime
lazy-loads the module for the recognised page (AR) or the selected page (preview), calls its default
export once per mount, then calls `update(t, dt)` every frame until the page is lost / changed.
`src/scenes/kit-demo.js` (`?mode=preview&page=kit`) is a complete working example that uses every
kit block. Read it alongside this document.

## 1. The module

```js
// src/scenes/page-05.js
export default function createScene(ctx) {
  const { THREE, kit, page, spec } = ctx;
  const group = new THREE.Group();          // everything you draw goes under this group
  // ... build objects once here (no per-frame allocation of geometries/materials) ...
  return {
    group,                                  // required: THREE.Object3D
    update(t, dt) { /* required: called every frame */ },
    dispose() { kit.disposeObject(group); }, // required: free GPU resources you created
  };
}
```

| field | meaning |
|---|---|
| `group` | Root of the scene. The runtime adds it to the page root (AR anchor / preview page). Do not add things to anything else. |
| `update(t, dt)` | `t` = seconds since mount (restarts at 0 on tap-to-restart / remount; pinned to a constant with `?t=`). `dt` = seconds since the previous frame (0 when frozen or paused; clamped to ≤ 0.1). |
| `dispose()` | Called on unmount. Dispose every geometry / material / texture you made. `kit.disposeObject(group)` does all of it for objects under `group`. The runtime also runs `disposeObject` on the page root afterwards as a safety net, but do not rely on it for things you created outside `group`. |

Rules:

- **Be a pure function of `t`** wherever practical: compute every pose/opacity/progress from `t`
  (use `kit.loop(t, T)` for looping), not by accumulating `dt`. This makes `?t=12.5` screenshots,
  restarts and AR pause/resume exact. Use `dt` only for things that are genuinely stateful.
- **Loop on your own duration** (typically 10-30 s). The runtime never stops calling `update`.
- Throwing from `createScene` / `update` is caught: the scene stops and the caption shows the error;
  the app keeps running.
- `createScene` must be synchronous. Build everything up front; no `await`, no network.

## 2. `ctx`

```ts
ctx = {
  THREE,            // the app's three.js module (0.187). Use this, or `import * as THREE from 'three'`.
  kit,              // the shared scene kit (section 4). Same as `import * as kit from '../kit/index.js'`.
  page: {
    width: 1,                 // page width in scene units
    height: 1.294,            // page height (792/612, letter; images are 1105 x 1430)
    bboxToRect(bbox),         // spec bbox -> { x, y, width, height, left, right, top, bottom } (page units, x/y = centre)
    uvToXY(u, v),             // normalised image coords (u right, v DOWN, 0..1) -> { x, y }
  },
  spec,             // parsed content/pages/page-XX.json (null if missing). Bundled at build time.
  pageNumber,       // 1..10 ('kit' for the demo)
  mode,             // 'ar' | 'preview' (scenes should normally NOT branch on this)
  setCaption(text), // set the HUD caption line; ^ / _ markup is applied (kit.fmt). '' hides it.
}
```

`spec` fields written by the page-understanding step (see `content/pages/*.json`):
`page`, `title`, `summary`, `blocks[] {id, type, text, bbox}`, `data` (tables, values),
`key_concepts[]`, `animation {mode, concept, why, anchor_bbox, ...}`. **bbox format**: normalised
`[x0, y0, x1, y1]` with origin at the TOP-LEFT of the page image, y downwards. Always convert with
`ctx.page.bboxToRect(bbox)`. Prefer copying the numbers you need from the spec into the scene as
constants (data tables, captions) so the scene still works if the spec changes; use the spec at
runtime only for things like bboxes and titles.

## 3. Coordinate frame (identical in AR and preview)

```
            +Y (top of the page)
             ^
             |   page: x in [-0.5, 0.5], y in [-0.647, 0.647], paper at z = 0
   (-0.5,0.647) +-----------+ (0.5,0.647)
             |  |           |
             |  |     O-----|----> +X (right)
             |  |           |
  (-0.5,-0.647) +-----------+
            +Z = out of the paper, towards the viewer/camera
```

- Origin = centre of the printed page; **1 unit = page width** (≈ 21.6 cm printed letter, so 0.01 ≈ 2 mm).
- Keep content within roughly x ∈ [-0.5, 0.5], y ∈ [-0.65, 0.65], z ∈ [0, 0.6]. Content far off the
  page is outside the camera view in AR.
- The reader normally holds the phone at the **bottom** of the page looking up/forward (preview's
  default view mimics this). Upright things should face **-Y** (towards the reader): e.g. a panel
  standing on the page uses `rotation.x = Math.PI / 2`.
- Things lying on the paper: put them at z ≈ 0.002-0.01 (avoid z = 0 to prevent z-fighting with the
  paper in preview).
- Lighting is provided by the runtime (a page-relative hemisphere + key + rim rig inside the page
  root). Do not add lights unless you need a special effect; `MeshStandardMaterial` looks right.
- In AR the anchor transform is scaled by the target size, so never assume world units = page units;
  work in your group's local frame (which *is* the page frame).

## 4. Kit API (`ctx.kit`, source in `src/kit/`)

All objects are `THREE.Object3D` subclasses you `group.add(...)`. All have `dispose()`.

### 4.1 Palette (`palette.js`)

`kit.palette`: `ink`, `inkSoft`, `grid`, `panel`, `panelEdge`, `white`, `primary` (blue),
`secondary` (orange), `tertiary` (green), `quaternary` (purple), `accent` (amber), `danger` (red),
`species[]` (6 particle colours), `reactant`, `product`, `catalyst`, `glass`, `water`, `iodineBlue`,
`sulfurYellow`, `gas`. `kit.seriesColors` = ordered colours for multiple curves.
Saturated mid-tones chosen to read both on white paper and over a camera feed. 2D content should sit
on a near-white backing (`Graph2D`, `Panel`, `Label({ background })`).

### 4.2 Text (`text.js`)

```js
new kit.Label(text, opts)   // or kit.label(text, opts)
label.setText(str); label.setColor(c); label.worldSize // {width, height}
```

Options: `size` (line height, default 0.035), `color`, `weight` (600), `italic`, `font`,
`background` (null → transparent with a white halo; a colour → rounded backing), `bgOpacity` (0.88),
`border`, `halo`, `haloColor`, `padding` (em), `align` ('left'|'center'|'right', also the horizontal
anchor), `anchorY` ('top'|'middle'|'bottom'), `maxWidth` (wraps), `lineHeight`, `billboard` (true →
always faces the camera), `rich` (apply `fmt`, default true), `depthTest`, `renderOrder` (20),
`opacity`.

Flat labels lie in their local XY plane facing +Z (readable from above). For upright labels set
`label.rotation.x = Math.PI / 2` or use `billboard: true`.

Unicode helpers (no LaTeX; rendered with system fonts):

```js
kit.fmt('mol dm^-3 s^-1')        // 'mol dm⁻³ s⁻¹'   (^ / _ + run of digits/sign, one letter, or {group})
kit.fmt('Rate = k[A]^x[B]^y')    // 'Rate = k[A]ˣ[B]ʸ'
kit.chem('2H2O2 -> 2H2O + O2')   // '2H₂O₂ → 2H₂O + O₂' (digits after element/)/] become subscripts)
kit.chem('S2O3^2-')              // 'S₂O₃²⁻'
kit.sup('2-'), kit.sub('2')
```

`Label` applies `fmt` automatically, so write `'cm^3'`, `'O_2'`; use `kit.chem(...)` for formulas.
Captions set through `ctx.setCaption` are also passed through `fmt`.

### 4.3 Graph2D (`graph2d.js`)

```js
const g = new kit.Graph2D({
  width: 0.62, height: 0.42,                         // whole panel incl. margins (page units)
  x: { min: 0, max: 60, ticks: 10, label: 'time / s' },
  y: { min: 0, max: 1, ticks: 0.2, label: '[H_2O_2] / mol dm^-3', format: (v) => v.toFixed(1) },
  title: 'Concentration against time',
  // fontSize 0.022, background palette.panel, backgroundOpacity 0.94, grid true,
  // axisColor, axisWidth 0.004, upright false, renderOrder 10, margin {left,right,top,bottom}
});
g.position.set(0, 0.3, 0.005);  group.add(g);

const c = g.plot((x) => Math.exp(-x / 20), { color: kit.palette.primary }); // or [[x,y], ...]
c.setProgress(f);                  // draw-on 0..1 (by arc length)
c.pointAt(f)                       // -> local {x, y} at that fraction (pen tip)
const tan = g.tangent(fn, x0, { span: 20 });   // tangent line; tan.slope, tan.point
g.line([x1, y1], [x2, y2], opts);  // straight segment (same return type as plot)
g.hline(y, opts); g.vline(x, opts);// dashed guides (opts.toX / toY to stop early)
const m = g.point(x, y, { color, radius }); m.setData(x2, y2);   // marker
const ms = g.points([[x,y], ...], opts); ms.setProgress(f);       // reveal markers one by one
g.label('k = 0.05 s^-1', x, y, labelOpts);                         // text at data coords
g.toLocal(x, y) / g.toWorld(x, y); g.removeItem(obj);
```

Plot options: `color`, `width` (0.006), `samples` (200), `domain` [x0, x1], `dashed`, `opacity`,
`progress`. Everything is clipped to the axis ranges. Lines are triangle ribbons (width in page units,
identical on every device). Layers are ordered by `renderOrder` (`renderOrder` … +5) so the panel
never z-fights. `upright: true` stands the panel on its bottom edge facing the reader.

`kit.Ribbon(points, { width, color, dashed, dash, gap, closed, z })` is the underlying thick-line
primitive if you need free 2D lines elsewhere (`setPoints`, `setProgress`, `pointAt`, `setColor`).

### 4.4 ParticleBox (`particles.js`)

```js
const box = new kit.ParticleBox({
  size: [0.42, 0.3, 0.22],            // x, y, z extent; box stands on the page (z from 0 to size[2])
  species: [
    { name: 'H2O2', color: kit.palette.reactant, radius: 0.012, count: 30, max: 40 },
    { name: 'O2',   color: kit.palette.product,  radius: 0.010, count: 0,  max: 20 },
  ],
  seed: 7, speed: 0.12,               // deterministic; speed in units/s
  // showBox true, boxColor, boxOpacity
});
// in update(t):
box.setCounts({ H2O2: 30 - k, O2: k });   // visible particles per species (<= max)
box.setConverted('H2O2', 'O2', n);        // recolour the first n H2O2 in place (no jumping)
box.speed = 0.2;                          // (changes positions discontinuously; see below)
box.update(t);
```

Motion is a pure function of `t * speed` (wall reflections, no particle-particle collisions). If you
need a smoothly varying speed, pass your own phase: `box.speed = 1; box.update(phase(t))` where
`phase` is the integral of speed.

### 4.5 Glassware (`glassware.js`)

All vessels **stand on the page**: axis +Z, base at z = 0, centred on their group origin.

```js
const b  = new kit.Beaker({ radius: 0.07, height: 0.14, level: 0.5, liquidColor, liquidOpacity: 0.75 });
const tt = new kit.TestTube({ radius: 0.018, height: 0.16, level: 0.4 });
const f  = new kit.ConicalFlask({ radius: 0.075, neck: 0.022, height: 0.16, level: 0.35 });
b.setLevel(0..1); b.setLiquidColor('#f2e394'); b.setLiquidOpacity(0.9); b.level;

const bub = new kit.Bubbles({ radius: 0.05, height: 0.06, count: 30, size: 0.004, speed: 0.06 });
f.add(bub); bub.setIntensity(rate01).update(t); bub.setHeight(h);

const s = new kit.GasSyringe({ length: 0.36, radius: 0.028, maxVolume: 100, majorTick: 20, labels: true });
s.setVolume(42);  // cm3, or s.setFraction(0.42); lies along +X, nozzle on the LEFT, rests on the page
```

Rendering order: liquid (renderOrder 1) → glass (2) → graph panels (10-15) → labels (20).

### 4.6 Primitives (`primitives.js`)

```js
new kit.Arrow({ from: [x,y,z], to: [x,y,z], color, radius: 0.006, headLength: 0.035, headRadius: 0.016 })
  .setEnds(from, to).setProgress(0..1).setColor(c)
new kit.HighlightRect(ctx.page.bboxToRect(bbox), { color, lineWidth: 0.006, fillOpacity: 0.14, padding: 0.008, pulse: true })
  .update(t)            // gentle pulse;  .setProgress(f) draws the outline on
new kit.Panel({ width, height, color, opacity: 0.9, radius, border })   // plain backing card
```

### 4.7 Timeline (`timeline.js`)

```js
kit.clamp(x, a=0, b=1)  kit.lerp(a, b, f)  kit.invLerp(a, b, x)  kit.remap(x, a0, a1, b0, b1)
kit.smoothstep(a, b, x) kit.ease.{linear,inQuad,outQuad,inOutQuad,inCubic,outCubic,inOutCubic,inOutSine,outBack,outElastic}
kit.loop(t, T)            // t mod T
kit.pingpong(t, period)   // 0..1..0
kit.tween(t, start, dur, ease = inOutCubic)    // eased progress of an interval
kit.envelope(t, start, end, fade = 0.4)        // 0 → fade in → 1 → fade out → 0
kit.totalDuration(steps)
kit.stepAt(t, steps)      // -> { index, step, local 0..1, elapsed, start, end, total }
kit.timeline(steps, { loop: true }).at(t)      // stepAt on the looped time (+ .t, .cycle)
const captions = kit.captionTrack(ctx, steps); captions(t)   // sets ctx.setCaption on change; returns stepAt result
```

`steps = [{ duration: 3, caption: 'Add the acid' }, { duration: 4, caption: (local) => '...' }, ...]`.
Extra fields on steps are yours to use.

### 4.8 Utilities (`util.js`)

`kit.rng(seed)` (deterministic PRNG → `() => [0,1)`), `kit.toColor(c)`, `kit.v3([x,y,z])`,
`kit.setOpacity(obj, alpha)` (multiplies every material's authored opacity; safe every frame; hides
at 0), `kit.disposeObject(obj)`, `kit.roundedRectShape(w, h, r)`, `kit.createLightingRig(THREE)`
(runtime use).

## 5. Developing and testing a scene

```sh
npm install
npm run dev                         # http://localhost:5173/?mode=preview&page=5
```

Preview URL parameters:

| param | effect |
|---|---|
| `mode=preview` / `mode=ar` | force a mode (default: AR on touch devices, preview elsewhere) |
| `page=5` / `page=kit` | page to show (implies preview) |
| `t=12.5` | freeze scene time at 12.5 s (deterministic) |
| `view=front` / `view=top` | camera preset (front = phone held at the bottom of the page) |
| `hud=0` | hide title bar and picker (caption stays) |

Keys in preview: ← / → page, `r` restart, `t` top view, `f` front view. Mouse: orbit / zoom / pan.

Screenshots (headless Chrome; output defaults to `screenshots/`, which is git-ignored):

```sh
npm run screenshots -- 5 --t 6                     # screenshots/page-05_t6.png
npm run screenshots -- 5 --t 0,4,8,12 --view top   # a sequence
npm run screenshots -- 1 5 kit --out /tmp/shots --size 1280x960 --hud 0
npm run screenshots                                # all pages + kit at t = 3
npm run build && npm run screenshots -- 5 --dist   # against the production build
```

The script prints `ok`/`FAIL` per image plus any console errors and scene exceptions, and exits
non-zero on failure. **Always look at the PNGs** for legibility and layout at several `t` values.
`CHROME_PATH=/path/to/chrome` overrides browser discovery.

AR test with a fake camera (renders the page image into a y4m webcam stream; needs ffmpeg):

```sh
npm run build && npm run test:ar -- 5 --shot /tmp/ar   # PASS if target 4 fires; screenshot of the AR view
```

## 6. Do / don't

Do
- Build once in `createScene`; in `update` only change transforms, opacity, `setProgress`, counts, text.
- Use the kit (labels, Graph2D, glassware, palette) so all pages look consistent.
- Keep text short and big enough: `size` ≥ 0.025 for labels, Graph2D `fontSize` ≥ 0.02.
- Put 2D content on a backing (`background`, `Graph2D`, `Panel`) so it reads over a camera feed.
- Use `ctx.setCaption` (or `kit.captionTrack`) for the one-line explanation of the current step.
- Dispose everything (`kit.disposeObject(group)` in `dispose()`).
- Check screenshots at several times, in both `view=front` and `view=top`.

Don't
- No external assets, fonts, CDNs, `fetch`, `import()` of URLs, or network of any kind. Everything
  must be generated in code (canvas textures, geometry).
- Don't touch the DOM, the renderer, the camera, `window`, or global state; don't add event listeners.
- Don't add objects outside `group`, don't modify `ctx`, don't add lights/fog to the scene root.
- Don't allocate geometries/materials/textures inside `update` (no `setText` every frame with a
  changing string unless the text really changed — `Label.setText` re-renders only on change).
- Don't rely on `Math.random()` (use `kit.rng(seed)`) or `Date.now()` (use `t`).
- Don't read `spec` fields that may be missing without a fallback (`spec?.title ?? '...'`).
