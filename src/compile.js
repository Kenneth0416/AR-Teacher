// In-browser fallback for `npm run compile-targets` (see compile.html).
import { Compiler } from './vendor/mindar/mindar-image.prod.js';
import { PAGE_IMAGES } from './pages.js';

const $ = (id) => document.getElementById(id);
$('go').onclick = async () => {
  $('go').disabled = true;
  $('status').textContent = 'Loading images...';
  const imgs = await Promise.all(PAGE_IMAGES.map((src) => new Promise((ok, err) => {
    const im = new Image(); im.onload = () => ok(im); im.onerror = err; im.src = src;
  })));
  $('status').textContent = `Compiling ${imgs.length} targets (takes ~30-90 s)...`;
  const c = new Compiler();
  await c.compileImageTargets(imgs, (p) => { $('bar').value = p; });
  const buf = await c.exportData();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buf]));
  a.download = 'pages.mind';
  a.click();
  $('status').textContent = `Done: ${(buf.byteLength / 1024).toFixed(0)} KiB. Save as public/targets/pages.mind`;
};
