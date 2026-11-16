import * as THREE from 'three';

/** Deterministic PRNG (mulberry32). `const r = rng(42); r() -> [0,1)` */
export function rng(seed = 1) {
  let a = seed >>> 0 || 1;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Accepts '#rrggbb', 0xrrggbb, THREE.Color or css names. */
export const toColor = (c) => (c instanceof THREE.Color ? c.clone() : new THREE.Color(c));

/** Dispose every geometry, material and texture under `root` (safe to call twice). */
export function disposeObject(root) {
  if (!root) return;
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      for (const k of Object.keys(m)) {
        const v = m[k];
        if (v && v.isTexture) v.dispose();
      }
      m.dispose();
    }
    if (typeof o.dispose === 'function' && !o.isScene && o !== root) {
      try { o.dispose(); } catch { /* ignore */ }
    }
  });
}

/**
 * Multiply the opacity of every material under `root` by `alpha` (0..1). The authored opacity is
 * remembered in material.userData.baseOpacity, so calling every frame is fine. Hides the object
 * entirely when alpha <= 0.001.
 */
export function setOpacity(root, alpha) {
  root.visible = alpha > 0.001;
  root.traverse((o) => {
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (m.userData.baseOpacity === undefined) {
        m.userData.baseOpacity = m.opacity;
        m.userData.baseTransparent = m.transparent;
      }
      m.opacity = m.userData.baseOpacity * alpha;
      const tr = m.userData.baseTransparent || alpha < 0.999;
      if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
    }
  });
}

/** THREE.Shape of a rounded rectangle centred on the origin. */
export function roundedRectShape(w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Vec-like input -> THREE.Vector3. Accepts [x,y,z], [x,y], {x,y,z} or Vector3. */
export function v3(p) {
  if (p?.isVector3) return p.clone();
  if (Array.isArray(p)) return new THREE.Vector3(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0);
  return new THREE.Vector3(p?.x ?? 0, p?.y ?? 0, p?.z ?? 0);
}
