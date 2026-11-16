// Preview mode: no camera. The page image is a textured plane in the SAME frame as the AR anchor
// (centre origin, width 1, +Y up the page, +Z out of the paper) and the scene mounts on top of it.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PAGE_COUNT, PAGE_ASPECT, pageImage } from '../pages.js';
import { SceneHost } from './scene-host.js';
import { hasScene } from '../scenes/registry.js';

export async function startPreview({ hud, params, frozenT }) {
  const stage = document.getElementById('stage');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2b2f36');
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 50);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  const setView = (v) => {
    if (v === 'top') { camera.position.set(0, 0, 2.3); controls.target.set(0, 0, 0); }
    else { camera.position.set(0, -1.05, 1.75); controls.target.set(0, -0.02, 0.08); }
    controls.update();
  };
  setView(params.get('view') || 'front');

  // the "printed page"
  const pageGroup = new THREE.Group();
  scene.add(pageGroup);
  const paperMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(1, PAGE_ASPECT), paperMat);
  paper.position.z = -0.0005;
  pageGroup.add(paper);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.03, PAGE_ASPECT + 0.03), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
  shadow.position.set(0.006, -0.008, -0.002);
  pageGroup.add(shadow);
  const loader = new THREE.TextureLoader();
  const texCache = new Map();
  const loadTex = (n) => {
    const url = pageImage(n);
    if (!url) return Promise.resolve(null);
    if (!texCache.has(n)) texCache.set(n, loader.loadAsync(url).then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; }));
    return texCache.get(n);
  };

  const host = new SceneHost({ mode: 'preview', hud, frozenT });
  window.__AR_HOST__ = host;

  // page picker
  const ids = [...Array.from({ length: PAGE_COUNT }, (_, i) => i + 1)];
  const { picker } = hud;
  picker.root.classList.remove('hidden');
  for (const id of ids) picker.select.add(new Option(`Page ${id}`, String(id)));
  picker.select.add(new Option('Kit demo', 'kit'));
  hud.setModeLink('📷 AR mode', '?mode=ar');

  let current = null;
  async function show(id) {
    window.__AR_READY__ = false;
    current = id;
    picker.select.value = String(id);
    const url = new URL(location.href);
    url.searchParams.set('mode', 'preview');
    url.searchParams.set('page', String(id));
    history.replaceState(null, '', url);
    const tex = await loadTex(id === 'kit' ? 1 : id);
    if (current !== id) return;
    paperMat.map = tex;
    paperMat.color.set(id === 'kit' ? 0x808080 : 0xffffff); // dim the page behind the kit demo
    paperMat.needsUpdate = true;
    if (!hasScene(id)) hud.setCaption(`No scene for page ${id}`);
    await host.mount(id, pageGroup);
    // signal readiness for screenshot scripts after two rendered frames
    let frames = 0;
    const tick = () => { if (++frames >= 2) window.__AR_READY__ = current === id; else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }
  const step = (d) => {
    const all = [...ids, 'kit'];
    const i = all.indexOf(current);
    show(all[(i + d + all.length) % all.length]);
  };
  picker.prev.onclick = () => step(-1);
  picker.next.onclick = () => step(1);
  picker.restart.onclick = () => host.restart();
  picker.select.onchange = () => show(picker.select.value === 'kit' ? 'kit' : Number(picker.select.value));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'r') host.restart();
    if (e.key === 't') setView('top');
    if (e.key === 'f') setView('front');
  });

  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now(); const dt = (now - last) / 1000; last = now;
    controls.update();
    host.update(dt);
    renderer.render(scene, camera);
  });

  const p = params.get('page');
  const first = p === 'kit' ? 'kit' : Math.min(PAGE_COUNT, Math.max(1, Number(p) || 1));
  await show(first);
  return { renderer, scene, camera, host, show };
}
