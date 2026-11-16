import * as THREE from 'three';
import { palette } from './palette.js';
import { Ribbon } from './lines.js';
import { roundedRectShape, toColor, v3, disposeObject } from './util.js';

/**
 * 3D arrow (cylinder shaft + cone head) from `from` to `to` (page coords, [x,y,z] or Vector3).
 *   const a = new Arrow({ from: [0, -0.2, 0.05], to: [0, 0.1, 0.05], color: palette.accent });
 *   a.setEnds(from, to);  a.setProgress(0..1) // grows from the tail
 * Options: color, radius (0.006), headLength (0.035), headRadius (0.016).
 */
export class Arrow extends THREE.Group {
  constructor({ from = [0, 0, 0], to = [0.1, 0, 0], color = palette.accent, radius = 0.006, headLength = 0.035, headRadius = 0.016 } = {}) {
    super();
    const mat = new THREE.MeshStandardMaterial({ color: toColor(color), roughness: 0.45, emissive: toColor(color), emissiveIntensity: 0.15 });
    this.material = mat;
    this.shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 16), mat);
    this.head = new THREE.Mesh(new THREE.ConeGeometry(headRadius, headLength, 20), mat);
    this.headLength = headLength;
    this.add(this.shaft, this.head);
    this.progress = 1;
    this.setEnds(from, to);
  }
  setEnds(from, to) {
    this.from = v3(from); this.to = v3(to);
    return this.setProgress(this.progress);
  }
  setProgress(p) {
    this.progress = Math.min(1, Math.max(0, p));
    const dir = this.to.clone().sub(this.from);
    const full = dir.length();
    const len = full * this.progress;
    this.visible = len > 1e-5;
    if (!this.visible) return this;
    dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const hl = Math.min(this.headLength, len * 0.6);
    const shaftLen = Math.max(1e-5, len - hl);
    this.shaft.quaternion.copy(q);
    this.shaft.scale.set(1, shaftLen, 1);
    this.shaft.position.copy(this.from).addScaledVector(dir, shaftLen / 2);
    this.head.quaternion.copy(q);
    this.head.scale.setScalar(hl / this.headLength);
    this.head.position.copy(this.from).addScaledVector(dir, shaftLen + hl / 2);
    return this;
  }
  setColor(c) { this.material.color.set(c); this.material.emissive.set(c); return this; }
  dispose() { disposeObject(this); }
}

/**
 * Outline (and optional translucent fill) around a page region, slightly above the paper.
 *   const r = ctx.page.bboxToRect(spec.blocks[3].bbox);
 *   const h = new HighlightRect(r, { color: palette.accent });
 *   h.update(t);           // gentle pulse (pure function of t); h.setProgress(p) draws the outline on
 * rect: { x, y, width, height } centre + size in page units (what page.bboxToRect returns).
 * Options: color, lineWidth (0.006), fillOpacity (0.14), padding (0.008), radius (0.012),
 *          z (0.002), pulse (true).
 */
export class HighlightRect extends THREE.Group {
  constructor(rect, { color = palette.accent, lineWidth = 0.006, fillOpacity = 0.14, padding = 0.008, radius = 0.012, z = 0.002, pulse = true } = {}) {
    super();
    const w = rect.width + padding * 2, h = rect.height + padding * 2;
    this.position.set(rect.x, rect.y, z);
    this.pulse = pulse;
    const shape = roundedRectShape(w, h, radius);
    this.fill = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: toColor(color), transparent: true, opacity: fillOpacity, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    this.fillOpacity = fillOpacity;
    const pts = shape.getSpacedPoints(120).map((p) => [p.x, p.y]);
    this.outline = new Ribbon(pts, { width: lineWidth, color, z: 0.0005 });
    this.add(this.fill, this.outline);
    this.fill.renderOrder = 1; this.outline.renderOrder = 2;
  }
  setProgress(p) { this.outline.setProgress(p); this.fill.visible = p > 0; return this; }
  update(t) {
    if (!this.pulse) return this;
    const k = 0.5 + 0.5 * Math.sin(t * Math.PI * 1.2);
    this.fill.material.opacity = this.fillOpacity * (0.6 + 0.8 * k);
    return this;
  }
  dispose() { disposeObject(this); }
}

/**
 * Plain rounded backing panel (e.g. behind a group of labels) in the local XY plane.
 *   const p = new Panel({ width: 0.4, height: 0.12 }); p.position.set(0, 0.5, 0.01);
 * Options: width, height, color (palette.panel), opacity (0.9), radius (0.014), border (null).
 */
export class Panel extends THREE.Group {
  constructor({ width = 0.4, height = 0.15, color = palette.panel, opacity = 0.9, radius = 0.014, border = null, borderWidth = 0.003 } = {}) {
    super();
    const shape = roundedRectShape(width, height, radius);
    this.add(new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: toColor(color), transparent: opacity < 1, opacity, side: THREE.DoubleSide, toneMapped: false })));
    if (border) this.add(new Ribbon(shape.getSpacedPoints(100).map((p) => [p.x, p.y]), { width: borderWidth, color: border, z: 0.0005 }));
  }
  dispose() { disposeObject(this); }
}
