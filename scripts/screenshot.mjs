#!/usr/bin/env node
// Headless screenshots of PREVIEW mode at a frozen scene time.
//
//   npm run screenshots                         # pages 1..10 + kit at t = 3 -> screenshots/
//   npm run screenshots -- 5                    # page 5
//   npm run screenshots -- 1 5 kit --t 0,2.5,8  # several pages x several times
//   npm run screenshots -- 3 --t 4 --out /tmp/shots --size 1280x960 --view top --hud 0
//   npm run screenshots -- 3 --dist             # use the production build in dist/ (run build first)
//
// Output: <out>/page-03_t4.png (one PNG per page/time). Exits non-zero if a page reports errors.
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { startStaticServer } from './lib/static-server.mjs';
import { findChrome, WEBGL_FLAGS } from './lib/chrome.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(`--${name}`); if (i < 0) return def; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const flag = (name) => { const i = argv.indexOf(`--${name}`); if (i < 0) return false; argv.splice(i, 1); return true; };
const times = String(opt('t', '3')).split(',').map(Number);
const out = resolve(ROOT, opt('out', 'screenshots'));
const [W, H] = String(opt('size', '1100x1000')).split('x').map(Number);
const view = opt('view', 'front');
const hudOff = opt('hud', '1') === '0';
const useDist = flag('dist');
const pages = argv.length ? argv : [...Array.from({ length: 10 }, (_, i) => String(i + 1)), 'kit'];

await mkdir(out, { recursive: true });
let server, base;
if (useDist) {
  server = await startStaticServer(resolve(ROOT, 'dist'));
  base = server.url + '/';
} else {
  server = await createServer({ root: ROOT, logLevel: 'warn', server: { port: 5199, strictPort: false, host: '127.0.0.1' } });
  await server.listen();
  base = server.resolvedUrls.local[0];
}
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: WEBGL_FLAGS });
let failures = 0;
try {
  for (const p of pages) {
    for (const t of times) {
      const page = await browser.newPage();
      await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
      const logs = [];
      page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
      page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
      const url = `${base}?mode=preview&page=${p}&t=${t}&view=${view}${hudOff ? '&hud=0' : ''}`;
      await page.goto(url, { waitUntil: 'load', timeout: 120000 });
      try {
        await page.waitForFunction('window.__AR_READY__ === true', { timeout: 120000 });
      } catch { logs.push('[timeout] scene never became ready'); }
      await new Promise((r) => setTimeout(r, 300));
      const errors = await page.evaluate('window.__AR_ERRORS__ || []');
      const name = `${/^\d+$/.test(p) ? 'page-' + p.padStart(2, '0') : p}_t${t}.png`;
      await page.screenshot({ path: resolve(out, name) });
      const bad = errors.length || logs.some((l) => l.startsWith('[pageerror]') || l.startsWith('[timeout]'));
      if (bad) failures++;
      console.log(`${bad ? 'FAIL' : 'ok  '} ${resolve(out, name)}`);
      for (const l of [...errors.map((e) => '[scene] ' + e), ...logs]) console.log('     ' + l);
      await page.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
process.exit(failures ? 1 : 0);
