// Entry: choose AR or preview mode.
//   ?mode=ar | ?mode=preview      force a mode (default: AR on touch devices with a camera API, else preview)
//   ?page=3 | ?page=kit           preview: page to show (implies preview mode if mode not given)
//   ?t=12.5                       freeze scene time (deterministic screenshots)
//   ?hud=0                        hide title bar / picker (captions stay)
//   ?view=top|front               preview camera preset
import { createHud } from './runtime/hud.js';

const params = new URLSearchParams(location.search);
const hud = createHud();
window.__AR_ERRORS__ = window.__AR_ERRORS__ || [];
window.addEventListener('error', (e) => window.__AR_ERRORS__.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => window.__AR_ERRORS__.push(String(e.reason?.message ?? e.reason)));

function pickMode() {
  const m = params.get('mode');
  if (m === 'ar' || m === 'preview') return m;
  if (params.has('page')) return 'preview';
  const touch = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
  return touch && navigator.mediaDevices?.getUserMedia ? 'ar' : 'preview';
}

const mode = pickMode();
document.body.dataset.mode = mode;
if (params.get('hud') === '0') hud.setClean(true);
const frozenT = params.has('t') && params.get('t') !== '' && Number.isFinite(Number(params.get('t'))) ? Number(params.get('t')) : null;

const start = mode === 'ar'
  ? import('./runtime/ar.js').then((m) => m.startAR({ hud, params, frozenT }))
  : import('./runtime/preview.js').then((m) => m.startPreview({ hud, params, frozenT }));

start.catch((e) => {
  console.error(e);
  window.__AR_ERRORS__.push(String(e?.message ?? e));
  hud.showError(`<b>Failed to start ${mode} mode.</b><br>${e?.message ?? e}<br><br><a href="?mode=preview">Open preview mode</a>`);
});
