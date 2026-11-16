import * as THREE from 'three';
import { palette } from './palette.js';
import { Label } from './text.js';
import { toColor, disposeObject, rng } from './util.js';

// All vessels STAND ON THE PAGE: axis along +Z, base at z = 0, centred on x = y = 0 of their group.
// (Internally built around Y with LatheGeometry and rotated by +90 deg about X.)

const glassMaterial = () => new THREE.MeshStandardMaterial({
  color: toColor(palette.glass), roughness: 0.08, metalness: 0, transparent: true, opacity: 0.28,
  side: THREE.DoubleSide, depthWrite: false,
});
const rimMaterial = () => new THREE.MeshStandardMaterial({ color: 0xf5f9ff, roughness: 0.2, transparent: true, opacity: 0.9 });

/**
 * Generic lathe vessel. `profile(h)` returns inner radius at height h in [0, height].
 * Subclasses: Beaker, TestTube, ConicalFlask.
 * Methods: setLevel(0..1) (liquid height as a fraction of vessel height), setLiquidColor(c),
 *          setLiquidOpacity(a), level (getter). `liquid` is the liquid Mesh (null-safe when level 0).
 */
export class Vessel extends THREE.Group {
  constructor({ height, profile, level = 0.5, liquidColor = palette.water, liquidOpacity = 0.75, segments = 40, wall = 0.003, rim = true }) {
    super();
    this.height = height;
    this.profile = profile;
    this.segments = segments;
    this.wall = wall;
    this.inner = new THREE.Group();
    this.inner.rotation.x = Math.PI / 2; // lathe Y axis -> page Z axis
    this.add(this.inner);
    const pts = [];
    const N = 48;
    for (let i = 0; i <= N; i++) { const h = (i / N) * height; pts.push(new THREE.Vector2(profile(h) + wall, h)); }
    // close the bottom (unless profile(0) is 0, e.g. round-bottom tube)
    if (profile(0) > 1e-4) pts.unshift(new THREE.Vector2(0, 0));
    this.glass = new THREE.Mesh(new THREE.LatheGeometry(pts, segments), glassMaterial());
    this.glass.renderOrder = 2;
    this.inner.add(this.glass);
    if (rim) {
      const rr = profile(height) + wall;
      const torus = new THREE.Mesh(new THREE.TorusGeometry(rr, Math.max(wall, 0.0025), 8, segments), rimMaterial());
      torus.rotation.x = Math.PI / 2;
      torus.position.y = height;
      this.inner.add(torus);
    }
    this.liquidMaterial = new THREE.MeshStandardMaterial({ color: toColor(liquidColor), roughness: 0.3, transparent: true, opacity: liquidOpacity, depthWrite: false, side: THREE.DoubleSide });
    this.liquid = new THREE.Mesh(new THREE.BufferGeometry(), this.liquidMaterial);
    this.liquid.renderOrder = 1;
    this.inner.add(this.liquid);
    this._level = -1;
    this.setLevel(level);
  }

  get level() { return this._level; }

  setLevel(f) {
    f = Math.min(1, Math.max(0, f));
    if (Math.abs(f - this._level) < 0.002) return this;
    this._level = f;
    const H = f * this.height;
    this.liquid.visible = H > 1e-4;
    if (!this.liquid.visible) return this;
    const pts = [new THREE.Vector2(0, 0.0005)];
    const N = 24;
    for (let i = 0; i <= N; i++) { const h = 0.0005 + (i / N) * (H - 0.0005); pts.push(new THREE.Vector2(Math.max(0, this.profile(h) - 0.0005), h)); }
    pts.push(new THREE.Vector2(0, H));
    this.liquid.geometry.dispose();
    this.liquid.geometry = new THREE.LatheGeometry(pts, this.segments);
    return this;
  }

  setLiquidColor(c) { this.liquidMaterial.color.set(c); return this; }
  setLiquidOpacity(a) { this.liquidMaterial.opacity = a; return this; }

  dispose() { disposeObject(this); }
}

/** Beaker: straight walls. new Beaker({ radius: 0.07, height: 0.14, level: 0.5, liquidColor }) */
export class Beaker extends Vessel {
  constructor({ radius = 0.07, height = 0.14, ...rest } = {}) {
    super({ height, profile: () => radius, ...rest });
    this.radius = radius;
    // spout hint: small lip ring is the rim torus; add graduation ticks
    const tickMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
    for (let i = 1; i <= 4; i++) {
      const tick = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.35, 0.0015, 0.0015), tickMat);
      tick.position.set(-radius * 0.45, -radius - 0.004, (i / 5) * height);
      this.add(tick);
    }
  }
}

/** Test tube with a round bottom. new TestTube({ radius: 0.018, height: 0.16, level: 0.4 }) */
export class TestTube extends Vessel {
  constructor({ radius = 0.018, height = 0.16, ...rest } = {}) {
    super({ height, profile: (h) => (h < radius ? Math.sqrt(Math.max(0, radius * radius - (radius - h) ** 2)) : radius), wall: 0.002, ...rest });
    this.radius = radius;
  }
}

/** Conical (Erlenmeyer) flask. new ConicalFlask({ radius: 0.075, neck: 0.022, height: 0.16 }) */
export class ConicalFlask extends Vessel {
  constructor({ radius = 0.075, neck = 0.022, height = 0.16, ...rest } = {}) {
    const coneTop = height * 0.72;
    super({
      height,
      profile: (h) => {
        if (h < 0.006) return radius - 0.006 + h; // rounded-ish base
        if (h < coneTop) return radius + (neck - radius) * (h / coneTop);
        return neck;
      },
      ...rest,
    });
    this.radius = radius;
  }
}

/**
 * Rising bubbles (pure function of t). Place inside a vessel: bubbles.position.z = 0 and set
 * `height` to the liquid height. new Bubbles({ radius: 0.05, height: 0.08, count: 30, size: 0.004 })
 * update(t) every frame; setIntensity(0..1) -> fraction of bubbles shown (reaction rate!).
 */
export class Bubbles extends THREE.Group {
  constructor({ radius = 0.05, height = 0.08, count = 30, size = 0.004, speed = 0.06, color = '#ffffff', seed = 3 } = {}) {
    super();
    const r = rng(seed);
    this.cfg = { height, speed };
    this.items = Array.from({ length: count }, () => ({ a: r() * Math.PI * 2, d: Math.sqrt(r()) * radius * 0.85, phase: r(), s: size * (0.6 + r() * 0.8), wob: r() * 6 }));
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: toColor(color), transparent: true, opacity: 0.85, roughness: 0.1 }), count);
    this.mesh.frustumCulled = false;
    this.add(this.mesh);
    this.intensity = 1;
    this._m = new THREE.Matrix4();
    this.update(0);
  }
  setIntensity(f) { this.intensity = Math.min(1, Math.max(0, f)); return this; }
  setHeight(h) { this.cfg.height = h; return this; }
  update(t) {
    const { height, speed } = this.cfg;
    const n = Math.round(this.items.length * this.intensity);
    const q = new THREE.Quaternion();
    this.items.forEach((b, i) => {
      const life = height / speed;
      const u = (((t / life + b.phase) % 1) + 1) % 1;
      const z = u * height;
      const s = i < n && height > 0.002 ? b.s * (0.7 + 0.3 * u) : 0;
      const x = Math.cos(b.a) * b.d + Math.sin(t * 3 + b.wob) * 0.002;
      const y = Math.sin(b.a) * b.d;
      this._m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s));
      this.mesh.setMatrixAt(i, this._m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    return this;
  }
  dispose() { disposeObject(this); }
}

/**
 * Gas syringe lying along +X, resting on the page (axis at z = radius). Nozzle on the LEFT
 * (x = -length/2); the plunger moves right as gas collects.
 *
 *   const s = new GasSyringe({ length: 0.36, radius: 0.028, maxVolume: 100, labels: true });
 *   s.setVolume(42);          // cm3 (0..maxVolume), or s.setFraction(0.42)
 *
 * Options: length, radius, maxVolume (100), majorTick (20), labels (true; numbers in cm3),
 * gasColor (palette.gas), gasOpacity (0.35), unit ('cm^3').
 */
export class GasSyringe extends THREE.Group {
  constructor({ length = 0.36, radius = 0.028, maxVolume = 100, majorTick = 20, labels = true, gasColor = palette.gas, gasOpacity = 0.35 } = {}) {
    super();
    Object.assign(this, { length, radius, maxVolume });
    const axis = new THREE.Group();
    axis.position.z = radius + 0.002;
    this.add(axis);
    this.axis = axis;
    const barrelLen = length * 0.82;
    this.x0 = -length / 2 + length * 0.06; // zero mark (inner end of barrel near nozzle)
    this.x1 = this.x0 + barrelLen * 0.95;    // max mark
    const cyl = (r, l, mat, x) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 32, 1, true), mat); m.rotation.z = Math.PI / 2; m.position.x = x; return m; };
    // barrel
    axis.add(cyl(radius, barrelLen, glassMaterial(), this.x0 + barrelLen / 2));
    // nozzle
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.25, radius * 0.25, length * 0.07, 16), glassMaterial());
    noz.rotation.z = Math.PI / 2; noz.position.x = this.x0 - length * 0.035; axis.add(noz);
    // end caps / rims
    for (const x of [this.x0, this.x0 + barrelLen]) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.002, 8, 32), rimMaterial());
      t.rotation.y = Math.PI / 2; t.position.x = x; axis.add(t);
    }
    // graduations
    const tickMat = new THREE.MeshBasicMaterial({ color: toColor(palette.ink) });
    const minor = majorTick / 2;
    for (let v = 0; v <= maxVolume + 1e-6; v += minor) {
      const major = Math.abs(v / majorTick - Math.round(v / majorTick)) < 1e-6;
      const x = this.x0 + (v / maxVolume) * (this.x1 - this.x0);
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.0012, major ? radius * 0.55 : radius * 0.3), tickMat);
      tick.position.set(x, -radius - 0.0006, major ? 0 : radius * 0.12);
      axis.add(tick);
      if (labels && major) {
        const l = new Label(String(Math.round(v)), { size: radius * 0.8, weight: 700 });
        l.position.set(x, -radius - 0.002, radius * 0.85);
        l.rotation.x = Math.PI / 2; // upright, facing the reader (-Y)
        axis.add(l);
      }
    }
    // gas column
    this.gasMat = new THREE.MeshStandardMaterial({ color: toColor(gasColor), transparent: true, opacity: gasOpacity, depthWrite: false });
    this.gas = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.96, radius * 0.96, 1, 32), this.gasMat);
    this.gas.rotation.z = Math.PI / 2;
    axis.add(this.gas);
    // plunger head + rod + thumb plate
    const pmat = new THREE.MeshStandardMaterial({ color: 0xf1f3f5, roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x495057, roughness: 0.6 });
    this.plunger = new THREE.Group();
    const head = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.97, radius * 0.97, 0.012, 32), dark);
    head.rotation.z = Math.PI / 2; head.position.x = 0.006;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, barrelLen, 12), pmat);
    rod.rotation.z = Math.PI / 2; rod.position.x = barrelLen / 2 + 0.012;
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius * 0.8, 0.006, 24), pmat);
    plate.rotation.z = Math.PI / 2; plate.position.x = barrelLen + 0.012;
    this.plunger.add(head, rod, plate);
    axis.add(this.plunger);
    this.volume = -1;
    this.setVolume(0);
  }
  setFraction(f) { return this.setVolume(f * this.maxVolume); }
  setVolume(v) {
    v = Math.min(this.maxVolume, Math.max(0, v));
    this.volume = v;
    const x = this.x0 + (v / this.maxVolume) * (this.x1 - this.x0);
    this.plunger.position.x = x;
    const len = Math.max(1e-4, x - this.x0);
    this.gas.scale.y = len;
    this.gas.position.x = this.x0 + len / 2;
    this.gas.visible = v > 0.01;
    return this;
  }
  dispose() { disposeObject(this); }
}
