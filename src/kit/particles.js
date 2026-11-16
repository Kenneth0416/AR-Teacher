import * as THREE from 'three';
import { palette } from './palette.js';
import { rng, toColor, disposeObject } from './util.js';

const tri = (x, L) => { // reflect x into [0, L] (triangle wave) - pure, so motion is a function of t
  if (L <= 0) return 0;
  const m = ((x % (2 * L)) + 2 * L) % (2 * L);
  return m <= L ? m : 2 * L - m;
};

/**
 * Particles of several species bouncing inside a box that stands on the page.
 * Motion is a PURE function of time (straight lines reflected by the walls; no particle-particle
 * collisions), so `?t=` freezing and scrubbing are exact.
 *
 *   const box = new ParticleBox({
 *     size: [0.42, 0.3, 0.22],                  // x, y, z extent (box spans z in [0, size[2]])
 *     species: [
 *       { name: 'H2O2', color: palette.reactant, radius: 0.012, count: 30, max: 40 },
 *       { name: 'O2',   color: palette.product,  radius: 0.010, count: 0,  max: 20 },
 *     ],
 *     seed: 7, speed: 0.12,
 *   });
 *   group.add(box);
 *   // in update(t):
 *   box.setCounts({ H2O2: 30 - k, O2: k });     // visible particles per species (<= max)
 *   box.update(t);
 *
 * Options: size, species[{ name, color, radius (0.012), count (10), max (count) }], seed (1),
 * speed (0.12 units/s), showBox (true), boxColor (palette.inkSoft), boxOpacity (0.08 fill).
 *
 * Methods:
 *   update(t)                  position all particles at time t (call every frame)
 *   setCounts({ name: n })     how many of each species are visible (first n slots shown)
 *   setCount(name, n)
 *   setConverted(from, to, n)  show the first n visible `from` particles with the colour/size of
 *                              `to`, in place (good for A -> B reactions without particles jumping)
 *   speed                      property, units per second (temperature!)
 */
export class ParticleBox extends THREE.Group {
  constructor(opts = {}) {
    super();
    const o = (this.opts = { size: [0.4, 0.3, 0.2], species: [], seed: 1, speed: 0.12, showBox: true, boxColor: palette.inkSoft, boxOpacity: 0.08, ...opts });
    this.speed = o.speed;
    const [sx, sy, sz] = o.size;
    const rand = rng(o.seed);
    this.species = o.species.map((s, i) => ({ name: s.name ?? `S${i}`, color: toColor(s.color ?? palette.species[i % palette.species.length]), radius: s.radius ?? 0.012, count: s.count ?? 10, max: Math.max(s.max ?? s.count ?? 10, s.count ?? 10) }));
    const total = this.species.reduce((a, s) => a + s.max, 0);
    // per-slot motion parameters
    this.slots = [];
    this.species.forEach((s, si) => {
      for (let k = 0; k < s.max; k++) {
        const th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1);
        const v = 0.6 + rand() * 0.8;
        this.slots.push({ si, k, p0: [rand(), rand(), rand()], v: [Math.sin(ph) * Math.cos(th) * v, Math.sin(ph) * Math.sin(th) * v, Math.cos(ph) * v] });
      }
    });
    const geo = new THREE.SphereGeometry(1, 16, 12);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.0 });
    this.mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, total));
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < total; i++) this.mesh.setColorAt(i, this.species[this.slots[i].si].color);
    this.add(this.mesh);
    this.converted = []; // { from, to, n }
    if (o.showBox) {
      const bg = new THREE.BoxGeometry(sx, sy, sz);
      bg.translate(0, 0, sz / 2);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(bg), new THREE.LineBasicMaterial({ color: toColor(o.boxColor), transparent: true, opacity: 0.7 }));
      const fill = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: o.boxOpacity, depthWrite: false, side: THREE.BackSide }));
      this.add(fill, edges);
    }
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this.update(0);
  }

  _index(name) { return typeof name === 'number' ? name : this.species.findIndex((s) => s.name === name); }

  setCount(name, n) { const i = this._index(name); if (i >= 0) this.species[i].count = Math.max(0, Math.min(this.species[i].max, Math.round(n))); return this; }
  setCounts(map) { for (const [k, v] of Object.entries(map)) this.setCount(k, v); return this; }
  get counts() { return Object.fromEntries(this.species.map((s) => [s.name, s.count])); }

  setConverted(from, to, n) {
    const f = this._index(from), t = this._index(to);
    this.converted = this.converted.filter((c) => c.from !== f);
    if (f >= 0 && t >= 0 && n > 0) this.converted.push({ from: f, to: t, n: Math.round(n) });
    return this;
  }

  update(t) {
    const [sx, sy, sz] = this.opts.size;
    const d = t * this.speed;
    const conv = new Map(this.converted.map((c) => [c.from, c]));
    const tmpC = new THREE.Color();
    this.slots.forEach((sl, i) => {
      let s = this.species[sl.si];
      const visible = sl.k < s.count;
      const c = conv.get(sl.si);
      const look = c && sl.k < c.n ? this.species[c.to] : s;
      const r = visible ? look.radius : 0;
      const Lx = sx - 2 * r, Ly = sy - 2 * r, Lz = sz - 2 * r;
      const x = -sx / 2 + r + tri(sl.p0[0] * Lx + sl.v[0] * d, Lx);
      const y = -sy / 2 + r + tri(sl.p0[1] * Ly + sl.v[1] * d, Ly);
      const z = r + tri(sl.p0[2] * Lz + sl.v[2] * d, Lz);
      this._m.compose(new THREE.Vector3(x, y, z), this._q, new THREE.Vector3(r, r, r));
      this.mesh.setMatrixAt(i, this._m);
      this.mesh.setColorAt(i, tmpC.copy(look.color));
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    return this;
  }

  dispose() { disposeObject(this); }
}
