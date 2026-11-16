import * as THREE from 'three';
import { toColor } from './util.js';

/**
 * Thick 2D polyline ("ribbon") in the local XY plane, made of triangles so the width is in world
 * units and identical on every device (WebGL line widths are always 1 px). Supports progressive
 * draw-on via setProgress(0..1) and dashes.
 *
 *   const r = new Ribbon([[0,0],[0.2,0.1],[0.4,0]], { width: 0.006, color: '#1f6feb' });
 *   r.setProgress(0.5);  // first half of the length is drawn
 *
 * Options: width (0.005), color, opacity (1), dashed (false), dash (0.02), gap (0.012),
 *          closed (false), z (0: sets position.z), depthTest (true).
 */
export class Ribbon extends THREE.Mesh {
  constructor(points = [], opts = {}) {
    const o = { width: 0.005, color: '#1f6feb', opacity: 1, dashed: false, dash: 0.02, gap: 0.012, closed: false, z: 0, depthTest: true, ...opts };
    const material = new THREE.MeshBasicMaterial({
      color: toColor(o.color), transparent: o.opacity < 1, opacity: o.opacity,
      side: THREE.DoubleSide, depthTest: o.depthTest, toneMapped: false,
    });
    super(new THREE.BufferGeometry(), material);
    this.opts = o;
    this.position.z = o.z; // z offset lives on the object (not the vertices)
    this.progress = 1;
    this.setPoints(points);
  }

  /** Replace the polyline. points: [[x,y], ...] or [{x,y}, ...] in local units. */
  setPoints(points) {
    const P = points.map((p) => (Array.isArray(p) ? [p[0], p[1]] : [p.x, p.y]));
    if (this.opts.closed && P.length > 2) P.push(P[0]);
    this.points = P;
    // cumulative length (for progress / dashes / pointAt)
    const L = [0];
    for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    this.lengths = L;
    this.totalLength = L[L.length - 1] || 0;
    this._build();
    this.setProgress(this.progress);
    return this;
  }

  _build() {
    const { width, dashed, dash, gap } = this.opts;
    const z = 0;
    const P = this.points;
    const pos = [];
    const idx = [];
    this._segEnd = []; // cumulative length at the end of each emitted quad
    const hw = width / 2;
    const quad = (a, b, na, nb, lenEnd) => {
      const i = pos.length / 3;
      pos.push(a[0] + na[0] * hw, a[1] + na[1] * hw, z, a[0] - na[0] * hw, a[1] - na[1] * hw, z,
        b[0] + nb[0] * hw, b[1] + nb[1] * hw, z, b[0] - nb[0] * hw, b[1] - nb[1] * hw, z);
      idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
      this._segEnd.push(lenEnd);
    };
    const segNormal = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
    if (P.length >= 2) {
      // miter normals at the vertices (limited) for continuous joins
      const N = P.map((p, i) => {
        const n0 = i > 0 ? segNormal(P[i - 1], p) : null;
        const n1 = i < P.length - 1 ? segNormal(p, P[i + 1]) : null;
        if (!n0) return n1;
        if (!n1) return n0;
        let mx = n0[0] + n1[0], my = n0[1] + n1[1];
        const ml = Math.hypot(mx, my);
        if (ml < 1e-6) return n1;
        mx /= ml; my /= ml;
        const k = 1 / Math.max(0.35, mx * n1[0] + my * n1[1]);
        return [mx * k, my * k];
      });
      if (!dashed) {
        for (let i = 0; i < P.length - 1; i++) quad(P[i], P[i + 1], N[i], N[i + 1], this.lengths[i + 1]);
      } else {
        // walk the length emitting dash quads (straight within a segment)
        const period = dash + gap;
        for (let i = 0; i < P.length - 1; i++) {
          const a = P[i], b = P[i + 1], l0 = this.lengths[i], l1 = this.lengths[i + 1];
          const n = segNormal(a, b);
          let s = Math.floor(l0 / period) * period;
          for (; s < l1; s += period) {
            const d0 = Math.max(s, l0), d1 = Math.min(s + dash, l1);
            if (d1 <= d0) continue;
            const f0 = (d0 - l0) / (l1 - l0 || 1), f1 = (d1 - l0) / (l1 - l0 || 1);
            quad([a[0] + (b[0] - a[0]) * f0, a[1] + (b[1] - a[1]) * f0], [a[0] + (b[0] - a[0]) * f1, a[1] + (b[1] - a[1]) * f1], n, n, d1);
          }
        }
      }
    }
    const g = this.geometry;
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
  }

  /** Draw-on: 0 = nothing, 1 = whole line. Granularity = one sample segment. */
  setProgress(p) {
    this.progress = Math.min(1, Math.max(0, p));
    const target = this.progress * this.totalLength;
    let n = 0;
    if (this.progress >= 1) n = this._segEnd.length;
    else while (n < this._segEnd.length && this._segEnd[n] <= target + 1e-9) n++;
    this.geometry.setDrawRange(0, n * 6);
    return this;
  }

  /** Point at fraction p of the length: {x, y}. Handy to put a marker at the pen tip. */
  pointAt(p) {
    const P = this.points, L = this.lengths;
    if (P.length === 0) return { x: 0, y: 0 };
    const target = Math.min(1, Math.max(0, p)) * this.totalLength;
    for (let i = 1; i < P.length; i++) {
      if (L[i] >= target) {
        const f = (target - L[i - 1]) / (L[i] - L[i - 1] || 1);
        return { x: P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, y: P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f };
      }
    }
    const last = P[P.length - 1];
    return { x: last[0], y: last[1] };
  }

  setColor(c) { this.material.color.set(c); return this; }

  dispose() { this.geometry.dispose(); this.material.dispose(); }
}

/** Subdivide a polyline so no segment is longer than maxLen (smooth draw-on for few points). */
export function densify(points, maxLen) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i > 0) {
      const q = points[i - 1];
      const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
      const n = Math.ceil(d / maxLen);
      for (let k = 1; k < n; k++) out.push([q[0] + ((p[0] - q[0]) * k) / n, q[1] + ((p[1] - q[1]) * k) / n]);
    }
    out.push([p[0], p[1]]);
  }
  return out;
}
