import * as THREE from 'three';
import { palette } from './palette.js';
import { disposeObject } from './util.js';

// ---------------------------------------------------------------------------------------------
// Unicode sub/superscript helpers
// ---------------------------------------------------------------------------------------------
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ', x: 'ˣ', y: 'ʸ', a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', m: 'ᵐ', o: 'ᵒ', p: 'ᵖ', t: 'ᵗ', z: 'ᶻ', k: 'ᵏ', '.': '·' };
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋', '−': '₋', '=': '₌', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', o: 'ₒ', x: 'ₓ', h: 'ₕ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', p: 'ₚ', s: 'ₛ', t: 'ₜ', i: 'ᵢ', r: 'ᵣ', u: 'ᵤ', v: 'ᵥ' };

/** 'x2-' -> 'ˣ²⁻' (characters without a superscript form are kept as-is). */
export const sup = (s) => [...String(s)].map((c) => SUP[c] ?? c).join('');
/** '2' -> '₂' */
export const sub = (s) => [...String(s)].map((c) => SUB[c] ?? c).join('');

/**
 * Light markup -> unicode. `^` / `_` apply to a braced group or to a run of [0-9+-−] / one letter:
 *   fmt('mol dm^-3 s^-1') -> 'mol dm⁻³ s⁻¹'     fmt('k[A]^x[B]^y') -> 'k[A]ˣ[B]ʸ'
 *   fmt('H_2O_2')         -> 'H₂O₂'             fmt('10^{-3}')     -> '10⁻³'
 * Labels apply fmt() automatically unless { rich: false }.
 */
export function fmt(s) {
  return String(s)
    .replace(/\^\{([^}]*)\}/g, (_, g) => sup(g))
    .replace(/_\{([^}]*)\}/g, (_, g) => sub(g))
    .replace(/\^([+\-−]?[0-9]+[+\-−]?|[+\-−]|[a-z])/g, (_, g) => sup(g))
    .replace(/_([0-9]+|[a-z])/g, (_, g) => sub(g));
}

/**
 * Chemical formula -> unicode: digits after an element / ')' / ']' become subscripts; leading
 * coefficients stay normal; `^` marks a charge.
 *   chem('2H2O2 -> 2H2O + O2') -> '2H₂O₂ → 2H₂O + O₂'
 *   chem('S2O3^2-')            -> 'S₂O₃²⁻'
 *   chem('[H2O2]')             -> '[H₂O₂]'
 */
export function chem(s) {
  return fmt(
    String(s)
      .replace(/->/g, '→')
      .replace(/<=>/g, '⇌')
      .replace(/([A-Za-z)\]])(\d+)/g, (_, a, d) => a + sub(d)),
  );
}

// ---------------------------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------------------------
export const FONT_STACK = '"Inter", "Helvetica Neue", "Segoe UI", Roboto, Arial, "Noto Sans", "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", "DejaVu Sans", sans-serif';
const PX = 96; // canvas font size in px per line: crisp at any on-screen size a phone will show

const ANCHOR_X = { left: 0, center: 0.5, right: 1 };
const ANCHOR_Y = { bottom: 0, middle: 0.5, top: 1 };

/**
 * A text label rendered to a canvas texture.
 *
 *   const l = new Label('Rate = k[A]^x', { size: 0.035, color: palette.ink, background: '#fff' });
 *   l.position.set(0, 0.4, 0.01); group.add(l); l.setText('...');
 *
 * Options (all optional):
 *   size        line height in world units (page width = 1). Default 0.035.
 *   color       text colour. Default palette.ink.
 *   weight      CSS font weight. Default 600.  italic: bool.  font: override the font family stack.
 *   background  null (default) or a colour -> rounded backing box. bgOpacity default 0.88.
 *   border      null or a colour for the backing outline.
 *   halo        outline stroke for legibility over a camera feed. Default: true when no background.
 *   haloColor   default '#ffffff'.
 *   padding     backing padding in em. Default 0.35.
 *   align       'left' | 'center' | 'right' text alignment AND horizontal anchor. Default 'center'.
 *   anchorY     'top' | 'middle' | 'bottom'. Default 'middle'.
 *   maxWidth    wrap width in world units (default: no wrap). lineHeight: multiple of size (1.25).
 *   billboard   true -> THREE.Sprite that always faces the camera. Default false (flat plane in
 *               the label's local XY plane, facing +Z).
 *   rich        apply fmt() (^ / _ markup). Default true.
 *   depthTest   default true. Set false to draw on top of everything (even opaque objects).
 *   renderOrder default 20: labels draw after glass (1-2) and graph panels (10-15) so they are not
 *               washed out by transparent objects behind them.
 *   opacity     default 1.
 */
export class Label extends THREE.Object3D {
  constructor(text = '', opts = {}) {
    super();
    this.opts = {
      size: 0.035, color: palette.ink, weight: 600, italic: false, font: FONT_STACK,
      background: null, bgOpacity: 0.88, border: null, halo: undefined, haloColor: '#ffffff',
      padding: 0.35, align: 'center', anchorY: 'middle', maxWidth: null, lineHeight: 1.25,
      billboard: false, rich: true, depthTest: true, opacity: 1, renderOrder: 20, ...opts,
    };
    if (this.opts.halo === undefined) this.opts.halo = !this.opts.background;
    this.canvas = document.createElement('canvas');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    const matOpts = { map: this.texture, transparent: true, depthWrite: false, depthTest: this.opts.depthTest, opacity: this.opts.opacity, toneMapped: false };
    if (this.opts.billboard) {
      this.material = new THREE.SpriteMaterial(matOpts);
      this.mesh = new THREE.Sprite(this.material);
    } else {
      this.material = new THREE.MeshBasicMaterial({ ...matOpts, side: THREE.DoubleSide });
      this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
    }
    this.mesh.renderOrder = this.opts.renderOrder;
    this.add(this.mesh);
    this.text = null;
    this.setText(text);
  }

  get renderOrder() { return this.mesh?.renderOrder ?? 0; }
  set renderOrder(v) { if (this.mesh) this.mesh.renderOrder = v; }

  /** Change text (re-renders only if different). Returns this. */
  setText(text) {
    text = String(text ?? '');
    if (text === this.text) return this;
    this.text = text;
    this._draw();
    return this;
  }

  /** Change colour (text). */
  setColor(color) { this.opts.color = color; this._draw(); return this; }

  /** World-unit size of the label box: { width, height }. */
  get worldSize() { return { width: this._w, height: this._h }; }

  _draw() {
    const o = this.opts;
    const display = o.rich ? fmt(this.text) : this.text;
    const ctx = this.canvas.getContext('2d');
    let px = PX;
    const fontFor = (p) => `${o.italic ? 'italic ' : ''}${o.weight} ${p}px ${o.font}`;
    ctx.font = fontFor(px);
    const maxPx = o.maxWidth ? (o.maxWidth / o.size) * px : Infinity;
    const lines = [];
    for (const para of display.split('\n')) {
      if (!isFinite(maxPx)) { lines.push(para); continue; }
      const words = para.split(/(\s+)/);
      let cur = '';
      for (const w of words) {
        const test = cur + w;
        if (cur && ctx.measureText(test).width > maxPx) { lines.push(cur.trimEnd()); cur = w.trimStart(); } else cur = test;
      }
      lines.push(cur);
    }
    const pad = o.padding * px * (o.background ? 1 : 0.4);
    const lh = px * o.lineHeight;
    let textW = Math.max(1, ...lines.map((l) => ctx.measureText(l).width));
    let W = Math.ceil(textW + pad * 2 + (o.halo ? px * 0.2 : 0));
    let H = Math.ceil(lh * lines.length + pad * 2 - (lh - px) * 0.5);
    // keep the canvas within GPU-friendly limits
    const scale = Math.min(1, 2048 / W, 2048 / H);
    const c = this.canvas;
    c.width = Math.max(2, Math.ceil(W * scale));
    c.height = Math.max(2, Math.ceil(H * scale));
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (o.background) {
      const r = Math.min(px * 0.3, H / 2);
      ctx.globalAlpha = o.bgOpacity;
      ctx.fillStyle = cssColor(o.background);
      roundRect(ctx, 1, 1, W - 2, H - 2, r);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (o.border) { ctx.lineWidth = px * 0.06; ctx.strokeStyle = cssColor(o.border); ctx.stroke(); }
    }
    ctx.font = fontFor(px);
    ctx.textBaseline = 'middle';
    ctx.textAlign = o.align;
    const x = o.align === 'left' ? pad + (o.halo ? px * 0.1 : 0) : o.align === 'right' ? W - pad - (o.halo ? px * 0.1 : 0) : W / 2;
    lines.forEach((line, i) => {
      const y = pad + px * 0.5 + i * lh + px * 0.04;
      if (o.halo) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = px * 0.16;
        ctx.strokeStyle = cssColor(o.haloColor);
        ctx.strokeText(line, x, y);
      }
      ctx.fillStyle = cssColor(o.color);
      ctx.fillText(line, x, y);
    });
    this.texture.needsUpdate = true;
    // world size: o.size per px-line
    const k = o.size / px;
    this._w = W * k;
    this._h = H * k;
    const ax = ANCHOR_X[o.align] ?? 0.5;
    const ay = ANCHOR_Y[o.anchorY] ?? 0.5;
    if (o.billboard) {
      this.mesh.scale.set(this._w, this._h, 1);
      this.mesh.center.set(ax, ay);
    } else {
      this.mesh.scale.set(this._w, this._h, 1);
      this.mesh.position.set((0.5 - ax) * this._w, (0.5 - ay) * this._h, 0);
    }
  }

  dispose() {
    this.texture.dispose();
    this.material.dispose();
    this.mesh.geometry?.dispose();
  }
}

/** Shorthand: `label('H2O2', { ... })` === `new Label(text, opts)`. */
export const label = (text, opts) => new Label(text, opts);

function cssColor(c) {
  if (typeof c === 'number') return '#' + c.toString(16).padStart(6, '0');
  if (c?.isColor) return '#' + c.getHexString();
  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

