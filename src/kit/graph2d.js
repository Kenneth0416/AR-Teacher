import * as THREE from 'three';
import { palette } from './palette.js';
import { Label } from './text.js';
import { Ribbon, densify } from './lines.js';
import { roundedRectShape, toColor, disposeObject } from './util.js';

// z layers inside a panel (local units) - keeps everything coplanar-but-ordered without z-fighting
const Z = { bg: 0, grid: 0.0012, axis: 0.0024, curve: 0.0036, marker: 0.0048, label: 0.006 };
// render order inside a panel (added to opts.renderOrder) - transparent layers must not be depth-sorted
const ORDER = { bg: 0, grid: 1, axis: 2, curve: 3, marker: 4, label: 5 };

const niceFmt = (v) => {
  const r = Math.round(v * 1e6) / 1e6;
  return String(r);
};

function ticksFor(axis) {
  if (Array.isArray(axis.ticks)) return axis.ticks;
  const step = axis.ticks ?? niceStep(axis.max - axis.min);
  if (!step) return [];
  const out = [];
  const start = Math.ceil(axis.min / step - 1e-9) * step;
  for (let v = start; v <= axis.max + step * 1e-6; v += step) out.push(Math.round(v / step) * step);
  return out;
}
function niceStep(range) {
  const raw = range / 5;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}

/**
 * A 2D chart panel in its local XY plane (facing +Z), centred on its origin.
 * Lies flat on the page by default; `upright: true` stands it up on its bottom edge (rotation.x =
 * 90 deg, facing the reader at the bottom of the page). Position/rotate it like any Object3D.
 *
 *   const g = new Graph2D({
 *     width: 0.62, height: 0.42,
 *     x: { min: 0, max: 60, ticks: 10, label: 'time / s' },
 *     y: { min: 0, max: 1.0, ticks: 0.2, label: '[H2O2] / mol dm^-3' },
 *     title: 'Concentration-time graph',
 *   });
 *   const c = g.plot((x) => Math.exp(-x / 20), { color: palette.primary });
 *   c.setProgress(t / 4);                        // draw-on
 *   g.tangent((x) => Math.exp(-x / 20), 10);     // tangent at x = 10
 *
 * Options: width, height (world units, whole panel incl. margins), x/y: { min, max, ticks (step
 * or array), label, format(v) -> string, showTicks (true) }, title, fontSize (0.022),
 * background (palette.panel, null = none), backgroundOpacity (0.9), grid (true), axisColor,
 * axisWidth (0.004), upright (false), margin: { left, right, top, bottom } overrides.
 */
export class Graph2D extends THREE.Group {
  constructor(opts = {}) {
    super();
    const o = (this.opts = {
      width: 0.6, height: 0.42, fontSize: 0.022, background: palette.panel, backgroundOpacity: 0.94,
      grid: true, axisColor: palette.ink, axisWidth: 0.004, title: null, upright: false, renderOrder: 10, ...opts,
    });
    this.xAxis = { min: 0, max: 1, label: '', format: niceFmt, showTicks: true, ...(o.x || {}) };
    this.yAxis = { min: 0, max: 1, label: '', format: niceFmt, showTicks: true, ...(o.y || {}) };
    const fs = o.fontSize;
    const m = {
      left: fs * (this.yAxis.label ? 4.2 : 2.8),
      right: fs * 1.0,
      top: o.title ? fs * 2.2 : fs * 0.9,
      bottom: fs * (this.xAxis.label ? 3.4 : 1.9),
      ...(o.margin || {}),
    };
    this.margin = m;
    // plot area in local coords
    this.plotRect = {
      x0: -o.width / 2 + m.left, x1: o.width / 2 - m.right,
      y0: -o.height / 2 + m.bottom, y1: o.height / 2 - m.top,
    };
    if (o.upright) this.rotation.x = Math.PI / 2;
    this.items = [];
    this._buildPanel();
  }

  /** Children get a render order from their z layer so panel layers never depth-sort wrongly. */
  add(...objs) {
    super.add(...objs);
    for (const o of objs) {
      const z = o.position.z;
      const layer = z >= Z.label - 1e-6 ? ORDER.label : z >= Z.marker - 1e-6 ? ORDER.marker : z >= Z.curve - 1e-6 ? ORDER.curve : z >= Z.axis - 1e-6 ? ORDER.axis : z >= Z.grid - 1e-6 ? ORDER.grid : ORDER.bg;
      const ro = (this.opts?.renderOrder ?? 10) + layer;
      o.traverse((c) => { c.renderOrder = ro; });
    }
    return this;
  }

  /** Data (x, y) -> local Vector3 on the panel (z = layer offset). */
  toLocal(x, y, z = Z.curve) {
    const r = this.plotRect, a = this.xAxis, b = this.yAxis;
    return new THREE.Vector3(
      r.x0 + ((x - a.min) / (a.max - a.min)) * (r.x1 - r.x0),
      r.y0 + ((y - b.min) / (b.max - b.min)) * (r.y1 - r.y0),
      z,
    );
  }

  /** Data (x, y) -> world-space Vector3 (call after the panel is placed / added to the scene). */
  toWorld(x, y) { this.updateMatrixWorld(true); return this.localToWorld(this.toLocal(x, y)); }

  _xy(x, y) { const v = this.toLocal(x, y); return [v.x, v.y]; }

  _buildPanel() {
    const o = this.opts, r = this.plotRect, fs = o.fontSize;
    if (o.background) {
      const bg = new THREE.Mesh(
        new THREE.ShapeGeometry(roundedRectShape(o.width, o.height, fs * 0.6)),
        new THREE.MeshBasicMaterial({ color: toColor(o.background), transparent: true, opacity: o.backgroundOpacity, side: THREE.DoubleSide, toneMapped: false }),
      );
      bg.position.z = Z.bg;
      this.add(bg);
      this.background = bg;
    }
    const xt = ticksFor(this.xAxis), yt = ticksFor(this.yAxis);
    if (o.grid) {
      const gw = Math.max(0.0012, o.axisWidth * 0.35);
      for (const v of xt) if (v > this.xAxis.min + 1e-9) this.add(new Ribbon([this._xy(v, this.yAxis.min), this._xy(v, this.yAxis.max)], { width: gw, color: palette.grid, z: Z.grid }));
      for (const v of yt) if (v > this.yAxis.min + 1e-9) this.add(new Ribbon([this._xy(this.xAxis.min, v), this._xy(this.xAxis.max, v)], { width: gw, color: palette.grid, z: Z.grid }));
    }
    // axes (L shape) with small arrow heads
    const aw = o.axisWidth;
    this.add(new Ribbon([[r.x0, r.y1 + fs * 0.4], [r.x0, r.y0], [r.x1 + fs * 0.4, r.y0]], { width: aw, color: o.axisColor, z: Z.axis }));
    this.add(arrowHead(r.x0, r.y1 + fs * 0.4, Math.PI / 2, fs * 0.45, o.axisColor));
    this.add(arrowHead(r.x1 + fs * 0.4, r.y0, 0, fs * 0.45, o.axisColor));
    const tickLen = fs * 0.35;
    const lab = (text, x, y, extra = {}) => {
      const l = new Label(text, { size: fs, color: palette.inkSoft, weight: 500, halo: false, ...extra });
      l.position.set(x, y, Z.label);
      this.add(l);
      return l;
    };
    if (this.xAxis.showTicks) for (const v of xt) {
      const [x] = this._xy(v, 0);
      this.add(new Ribbon([[x, r.y0], [x, r.y0 - tickLen]], { width: aw * 0.7, color: o.axisColor, z: Z.axis }));
      lab(this.xAxis.format(v), x, r.y0 - tickLen - fs * 0.15, { anchorY: 'top' });
    }
    if (this.yAxis.showTicks) for (const v of yt) {
      const [, y] = this._xy(0, v);
      this.add(new Ribbon([[r.x0, y], [r.x0 - tickLen, y]], { width: aw * 0.7, color: o.axisColor, z: Z.axis }));
      lab(this.yAxis.format(v), r.x0 - tickLen - fs * 0.2, y, { align: 'right' });
    }
    if (this.xAxis.label) lab(this.xAxis.label, (r.x0 + r.x1) / 2, -o.height / 2 + fs * 0.35, { anchorY: 'bottom', color: palette.ink, weight: 600 });
    if (this.yAxis.label) {
      const l = lab(this.yAxis.label, -o.width / 2 + fs * 0.35, (r.y0 + r.y1) / 2, { anchorY: 'top', color: palette.ink, weight: 600 });
      l.rotation.z = Math.PI / 2;
    }
    if (o.title) lab(o.title, 0, o.height / 2 - fs * 0.3, { anchorY: 'top', color: palette.ink, weight: 700, size: fs * 1.1 });
  }

  /**
   * Plot a curve. `src` is a function y = f(x) or an array of [x, y] points (data units).
   * Returns a Ribbon (setProgress(0..1), pointAt(p) -> local {x,y}, setColor). Anything outside
   * the axis ranges is clipped away. Options: color, width (0.006), samples (200), domain [x0, x1]
   * (default: the x axis range), dashed, opacity, progress (initial, default 1).
   */
  plot(src, opts = {}) {
    const o = { color: palette.primary, width: 0.006, samples: 200, domain: [this.xAxis.min, this.xAxis.max], progress: 1, ...opts };
    let data;
    if (typeof src === 'function') {
      data = [];
      const [a, b] = o.domain;
      for (let i = 0; i <= o.samples; i++) { const x = a + ((b - a) * i) / o.samples; data.push([x, src(x)]); }
    } else data = src.map((p) => (Array.isArray(p) ? p : [p.x, p.y]));
    const pts = clipPolyline(data.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), this.xAxis, this.yAxis).map(([x, y]) => this._xy(x, y));
    const r = this.plotRect;
    const dense = densify(pts, Math.hypot(r.x1 - r.x0, r.y1 - r.y0) / 200);
    const rib = new Ribbon(dense, { color: o.color, width: o.width, dashed: o.dashed, opacity: o.opacity ?? 1, z: Z.curve });
    rib.setProgress(o.progress);
    rib.dataToLocal = (x, y) => this.toLocal(x, y);
    this.add(rib);
    this.items.push(rib);
    return rib;
  }

  /** Straight segment between two data points. Same options/return as plot(). */
  line(p1, p2, opts = {}) { return this.plot([p1, p2], { color: palette.inkSoft, width: 0.004, ...opts }); }

  /** Dashed horizontal guide at y (from x.min to `toX`, default x.max). */
  hline(y, opts = {}) { return this.plot([[this.xAxis.min, y], [opts.toX ?? this.xAxis.max, y]], { color: palette.inkSoft, width: 0.003, dashed: true, ...opts }); }

  /** Dashed vertical guide at x (from y.min to `toY`, default y.max). */
  vline(x, opts = {}) { return this.plot([[x, this.yAxis.min], [x, opts.toY ?? this.yAxis.max]], { color: palette.inkSoft, width: 0.003, dashed: true, ...opts }); }

  /**
   * Tangent to y = f(x) at x0 (slope by central difference, or pass opts.slope). Drawn over
   * x0 +/- span/2 (data units, default 40% of the x range). Returns the Ribbon with extra
   * `.slope` and `.point` ([x0, y0]).
   */
  tangent(f, x0, opts = {}) {
    const h = (this.xAxis.max - this.xAxis.min) * 1e-4;
    const slope = opts.slope ?? (f(x0 + h) - f(x0 - h)) / (2 * h);
    const y0 = f(x0);
    const span = opts.span ?? (this.xAxis.max - this.xAxis.min) * 0.4;
    const xa = x0 - span / 2, xb = x0 + span / 2;
    const rib = this.plot([[xa, y0 + slope * (xa - x0)], [xb, y0 + slope * (xb - x0)]], { color: palette.danger, width: 0.004, ...opts });
    rib.slope = slope;
    rib.point = [x0, y0];
    return rib;
  }

  /**
   * Point marker (filled circle with white outline) at data (x, y). Returns the Mesh; move it with
   * marker.position.copy(graph.toLocal(x, y, marker.position.z)). Options: color, radius (0.009).
   */
  point(x, y, opts = {}) {
    const o = { color: palette.primary, radius: 0.009, ...opts };
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CircleGeometry(o.radius * 1.35, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
    const dot = new THREE.Mesh(new THREE.CircleGeometry(o.radius, 24), new THREE.MeshBasicMaterial({ color: toColor(o.color), toneMapped: false }));
    dot.position.z = 0.0006;
    g.add(ring, dot);
    g.position.copy(this.toLocal(x, y, Z.marker));
    g.setData = (nx, ny) => g.position.copy(this.toLocal(nx, ny, Z.marker));
    this.add(g);
    this.items.push(g);
    return g;
  }

  /**
   * Several markers; returns { markers, setProgress(p) } where p reveals them one by one
   * (p = k / n shows k markers).
   */
  points(list, opts = {}) {
    const markers = list.map((p) => this.point(p[0], p[1], opts));
    const api = {
      markers,
      setProgress(p) { const n = Math.round(Math.min(1, Math.max(0, p)) * markers.length); markers.forEach((m, i) => { m.visible = i < n; }); return api; },
    };
    return api;
  }

  /** Text at data coordinates (Label options apply; default size = fontSize). */
  label(text, x, y, opts = {}) {
    const l = new Label(text, { size: this.opts.fontSize, color: palette.ink, ...opts });
    l.position.copy(this.toLocal(x, y, Z.label));
    this.add(l);
    this.items.push(l);
    return l;
  }

  /** Remove and dispose an item returned by plot/point/label/... */
  removeItem(...objs) {
    for (const obj of objs) {
      if (obj && obj.parent === this) {
        this.remove(obj);
        disposeObject(obj);
        this.items = this.items.filter((i) => i !== obj);
      }
    }
    return this;
  }

  dispose() { disposeObject(this); }
}

// Clip a polyline (data units) to the axis ranges; parts outside are dropped (pieces are joined).
function clipPolyline(P, ax, ay) {
  const out = [];
  const push = (p) => { const l = out[out.length - 1]; if (!l || Math.abs(l[0] - p[0]) > 1e-12 || Math.abs(l[1] - p[1]) > 1e-12) out.push(p); };
  for (let i = 0; i < P.length - 1; i++) {
    const [x0, y0] = P[i], [x1, y1] = P[i + 1];
    let t0 = 0, t1 = 1;
    const dx = x1 - x0, dy = y1 - y0;
    const edges = [[-dx, x0 - ax.min], [dx, ax.max - x0], [-dy, y0 - ay.min], [dy, ay.max - y0]];
    let ok = true;
    for (const [p, q] of edges) {
      if (Math.abs(p) < 1e-15) { if (q < 0) { ok = false; break; } continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; }
    }
    if (!ok) continue;
    push([x0 + dx * t0, y0 + dy * t0]);
    push([x0 + dx * t1, y0 + dy * t1]);
  }
  if (P.length === 1) out.push(P[0]);
  return out;
}

function arrowHead(x, y, angle, size, color) {
  const s = new THREE.Shape();
  s.moveTo(size, 0); s.lineTo(-size * 0.4, size * 0.55); s.lineTo(-size * 0.4, -size * 0.55); s.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: toColor(color), side: THREE.DoubleSide, toneMapped: false }));
  m.position.set(x, y, Z.axis);
  m.rotation.z = angle;
  return m;
}
