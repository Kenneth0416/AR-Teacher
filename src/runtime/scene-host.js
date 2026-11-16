import * as THREE from 'three';
import * as kit from '../kit/index.js';
import { loadSpec, pageTitle } from '../pages.js';
import { loadSceneModule } from '../scenes/registry.js';
import { createPageFrame } from './page-frame.js';

const PAGE = createPageFrame();

/**
 * Owns the lifecycle of the ONE active page scene (AR and preview share this):
 * load module + spec -> build ctx -> createScene(ctx) -> add to the page root -> update(t, dt)
 * every frame -> dispose on unmount. Isolates scene errors so a broken scene never kills the app.
 */
export class SceneHost {
  constructor({ mode, hud, frozenT = null }) {
    this.mode = mode;
    this.hud = hud;
    this.frozenT = frozenT; // number -> scene time is pinned (screenshots)
    this.current = null;    // { id, scene, root, parent }
    this.elapsed = 0;
    this.paused = false;
    this._token = 0;
    this.failed = false;
  }

  get pageId() { return this.current?.id ?? null; }

  /** Mount scene `id` (1..N or 'kit') under `parent` (AR anchor group or preview page group). */
  async mount(id, parent) {
    if (this.current && this.current.id === id && this.current.parent === parent) {
      this.resume();
      return this.current;
    }
    this.unmount();
    const token = ++this._token;
    this.hud?.setTitle(pageTitle(id, null));
    this.hud?.setCaption('');
    let spec = null, mod = null;
    try {
      [spec, mod] = await Promise.all([id === 'kit' ? null : loadSpec(id), loadSceneModule(id)]);
    } catch (e) {
      return this._fail(`Could not load scene ${id}`, e);
    }
    if (token !== this._token) return null; // superseded while loading
    this.hud?.setTitle(pageTitle(id, spec));
    if (!mod?.default) return this._fail(`No scene module for page ${id}`);

    const root = new THREE.Group();
    root.name = `page-root-${id}`;
    root.add(kit.createLightingRig(THREE));
    const ctx = Object.freeze({
      THREE,
      kit,
      page: PAGE,
      spec,
      pageNumber: id,
      mode: this.mode,
      setCaption: (text) => { if (token === this._token) this.hud?.setCaption(kit.fmt(text ?? '')); },
    });
    let scene;
    try {
      scene = mod.default(ctx);
      if (!scene || !scene.group?.isObject3D || typeof scene.update !== 'function') throw new Error('createScene(ctx) must return { group: Object3D, update(t, dt), dispose() }');
    } catch (e) {
      kit.disposeObject(root);
      return this._fail(`Scene ${id} failed to build`, e);
    }
    root.add(scene.group);
    parent.add(root);
    this.current = { id, scene, root, parent, spec };
    this.failed = false;
    this.elapsed = 0;
    this.paused = false;
    this._step(0); // render the first frame at t = 0 (or frozen t) immediately
    return this.current;
  }

  /** Advance the clock by dt seconds (real time) and update the scene. */
  update(dt) {
    if (!this.current || this.failed) return;
    if (!this.paused && this.frozenT === null) this.elapsed += Math.min(Math.max(dt, 0), 0.1);
    this._step(this.paused || this.frozenT !== null ? 0 : Math.min(Math.max(dt, 0), 0.1));
  }

  _step(dt) {
    const t = this.frozenT ?? this.elapsed;
    try {
      this.current.scene.update(t, dt);
    } catch (e) {
      this._fail(`Scene ${this.current.id} update error`, e);
    }
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; }
  restart() { this.elapsed = 0; this.paused = false; if (this.current) this._step(0); }

  unmount() {
    this._token++;
    const c = this.current;
    if (!c) return;
    this.current = null;
    c.root.removeFromParent();
    try { c.scene.dispose?.(); } catch (e) { console.warn('[scene] dispose error', e); }
    kit.disposeObject(c.root); // safety net: everything still under the root
    this.hud?.setCaption('');
  }

  _fail(msg, err) {
    console.error(`[scene] ${msg}`, err ?? '');
    this.failed = true;
    (window.__AR_ERRORS__ ||= []).push(`${msg}: ${err?.message ?? err ?? ''}`);
    this.hud?.setCaption(`⚠ ${msg}${err?.message ? ': ' + err.message : ''}`);
    return null;
  }
}
