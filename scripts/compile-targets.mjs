#!/usr/bin/env node
// Compile assets/pages/page-01.jpg ... page-10.jpg (in that order) into ONE MindAR multi-target file
// public/targets/pages.mind, using MindAR's own browser Compiler inside headless Chrome.
// Target index i  <->  page i+1.
//
//   npm run compile-targets                 # all pages found in assets/pages
//   node scripts/compile-targets.mjs --out public/targets/pages.mind
//
// Fallback if headless Chrome is unavailable: `npm run dev`, open /compile.html, press Compile,
// and save the downloaded pages.mind to public/targets/.
import puppeteer from 'puppeteer-core';
import { readdirSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { startStaticServer } from './lib/static-server.mjs';
import { findChrome, WEBGL_FLAGS } from './lib/chrome.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const OUT = resolve(ROOT, outArg >= 0 ? args[outArg + 1] : 'public/targets/pages.mind');

const pages = readdirSync(resolve(ROOT, 'assets/pages')).filter((f) => /^page-\d+\.jpg$/.test(f)).sort();
if (!pages.length) throw new Error('No assets/pages/page-XX.jpg found');
console.log(`Compiling ${pages.length} targets:`, pages.join(', '));

const html = `<!doctype html><meta charset="utf-8"><body><script type="module">
import { Compiler } from '/src/vendor/mindar/mindar-image.prod.js';
const files = ${JSON.stringify(pages)};
window.__progress = 0;
window.__run = async () => {
  const imgs = await Promise.all(files.map((f) => new Promise((ok, err) => {
    const im = new Image(); im.onload = () => ok(im); im.onerror = err; im.src = '/assets/pages/' + f;
  })));
  const c = new Compiler();
  await c.compileImageTargets(imgs, (p) => { window.__progress = p; });
  const buf = await c.exportData();
  let s = ''; const u8 = new Uint8Array(buf);
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
};
window.__ready = true;
</script>`;

const server = await startStaticServer(ROOT, { '/__compile.html': { type: 'text/html', body: html } });
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: WEBGL_FLAGS });
try {
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.error('[browser]', m.text()); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(`${server.url}/__compile.html`);
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });
  const t0 = Date.now();
  const tick = setInterval(async () => {
    try { process.stdout.write(`\r  progress ${(await page.evaluate('window.__progress')).toFixed(1)}%   `); } catch {}
  }, 2000);
  const b64 = await page.evaluate('window.__run()');
  clearInterval(tick);
  const buf = Buffer.from(b64, 'base64');
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, buf);
  console.log(`\nWrote ${OUT} (${(buf.length / 1024).toFixed(0)} KiB, ${pages.length} targets) in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
} finally {
  await browser.close();
  await server.close();
}
