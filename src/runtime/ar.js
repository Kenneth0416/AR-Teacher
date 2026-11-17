// AR mode: MindAR image tracking (one multi-target file, maxTrack 1). Target i -> page i + 1.
// When a target is found its page scene mounts on that target's anchor and its clock starts;
// when lost the clock pauses, and the scene is unmounted if the page stays lost for LOST_GRACE_S.
import * as THREE from 'three';
import { SceneHost } from './scene-host.js';
import { PAGE_COUNT } from '../pages.js';
import { PoseSmoother } from './pose-smoother.js';

const LOST_GRACE_S = 2.5;
const TARGETS_URL = 'targets/pages.mind'; // relative to the page (public/targets/pages.mind)

export async function startAR({ hud, params, frozenT }) {
  const state = (window.__AR_STATE__ = { mode: 'ar', phase: 'init', found: [], lost: [], current: null, error: null });
  const stage = document.getElementById('stage');
  hud.setTitle('AR Teacher');
  hud.setModeLink('🖥 Preview', '?mode=preview');

  const fail = (title, detail) => {
    state.phase = 'error';
    state.error = title;
    hud.hideHint();
    hud.showError(`<b>${title}</b><br>${detail}<br><br>
      <a href="?mode=preview">Open preview mode</a> (no camera needed) · <a href="">Retry</a>`);
  };

  if (!window.isSecureContext) {
    return fail('Camera needs HTTPS.', 'Open this page via https:// (e.g. GitHub Pages) or localhost.');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return fail('No camera API in this browser.', 'Use Safari (iOS) or Chrome (Android).');
  }

  // 1. download the target file ourselves (progress + clear error instead of a silent hang)
  hud.showHint('Loading page targets…');
  let targetsBlobUrl;
  try {
    const res = await fetch(new URL(TARGETS_URL, document.baseURI));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const total = Number(res.headers.get('content-length')) || 0;
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      hud.showHint(`Loading page targets… ${(got / 1048576).toFixed(1)}${total ? ' / ' + (total / 1048576).toFixed(1) : ''} MB`);
    }
    targetsBlobUrl = URL.createObjectURL(new Blob(chunks));
  } catch (e) {
    return fail('Could not load targets/pages.mind.', `${e.message}. Run <code>npm run compile-targets</code>.`);
  }

  // 2. MindAR (lazy: ~2.5 MB incl. TensorFlow.js; preview mode never loads it)
  hud.showHint('Starting camera…');
  const { MindARThree } = await import('../vendor/mindar/mindar-image-three.prod.js');
  const num = (k) => (params.has(k) ? Number(params.get(k)) : null);
  const mind = new MindARThree({
    container: stage,
    imageTargetSrc: targetsBlobUrl,
    maxTrack: 1,
    uiLoading: 'no', uiScanning: 'no', uiError: 'no',
    filterMinCF: num('filterMinCF'), filterBeta: num('filterBeta'),
    warmupTolerance: num('warmup'), missTolerance: num('miss'),
  });
  const { renderer, scene, camera } = mind;
  window.__AR_MIND__ = mind; // debugging / tests
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const host = new SceneHost({ mode: 'ar', hud, frozenT });
  window.__AR_HOST__ = host;
  let visibleTarget = null;
  let lostTimer = null;
  // scenes mount on a group that follows the anchor with adaptive damping (see pose-smoother.js)
  const smoother = new PoseSmoother({ strength: params.has('smooth') ? Number(params.get('smooth')) : 1 });
  scene.add(smoother.group);
  window.__AR_SMOOTHER__ = smoother;

  const showScanHint = () => hud.showHint('<div class="frame"></div>Point the camera at a textbook page (p.1–10)');

  for (let i = 0; i < PAGE_COUNT; i++) {
    const anchor = mind.addAnchor(i);
    anchor.onTargetFound = () => {
      state.found.push(i);
      state.current = i;
      visibleTarget = i;
      clearTimeout(lostTimer);
      hud.hideHint();
      smoother.follow(anchor.group);
      host.mount(i + 1, smoother.group).then(() => host.resume());
    };
    anchor.onTargetLost = () => {
      state.lost.push(i);
      if (visibleTarget !== i) return;
      visibleTarget = null;
      state.current = null;
      host.pause();
      showScanHint();
      clearTimeout(lostTimer);
      lostTimer = setTimeout(() => { if (visibleTarget === null) host.unmount(); }, LOST_GRACE_S * 1000);
    };
  }

  // tap anywhere (not on HUD buttons) -> restart the current animation
  stage.addEventListener('click', () => { if (host.current) host.restart(); });

  try {
    await mind.start();
  } catch (e) {
    return fail('Camera unavailable.', `Permission denied, camera in use, or no camera found${e?.message ? ' (' + e.message + ')' : ''}.`);
  }
  state.phase = 'tracking';
  showScanHint();

  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now(); const dt = (now - last) / 1000; last = now;
    smoother.update(dt);
    host.update(dt);
    renderer.render(scene, camera);
  });
  window.addEventListener('pagehide', () => { try { mind.stop(); } catch { /* ignore */ } });
  return { mind, host };
}
