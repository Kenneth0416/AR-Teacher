#!/usr/bin/env node
// End-to-end AR tracking test with a FAKE CAMERA (no phone needed):
// renders page N's image into a .y4m video with ffmpeg, feeds it to headless Chrome as the webcam,
// opens the production build in AR mode and checks that MindAR fires target N-1.
//
//   npm run build && npm run test:ar -- 5        # page 5 (default: 1 and 5)
//   npm run test:ar -- 1 3 7 --shot /tmp/ar      # also save a screenshot per page
//
// Requires ffmpeg on PATH. Slow on software WebGL (~20-90 s per page).
import puppeteer from 'puppeteer-core';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { startStaticServer } from './lib/static-server.mjs';
import { findChrome, WEBGL_FLAGS } from './lib/chrome.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const si = argv.indexOf('--shot');
const shotDir = si >= 0 ? resolve(argv.splice(si, 2)[1]) : null;
const pages = (argv.length ? argv : ['1', '5']).map(Number);
if (!existsSync(resolve(ROOT, 'dist/index.html'))) throw new Error('Run `npm run build` first');
if (shotDir) mkdirSync(shotDir, { recursive: true });

const server = await startStaticServer(resolve(ROOT, 'dist'));
let failures = 0;
for (const n of pages) {
  const img = resolve(ROOT, `assets/pages/page-${String(n).padStart(2, '0')}.jpg`);
  const y4m = resolve(tmpdir(), `ar-teacher-fakecam-p${n}.y4m`);
  // portrait 720x960 "phone camera" frame: page slightly smaller than the frame on a grey desk
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', img, '-vf',
    'scale=600:-2,pad=720:960:(ow-iw)/2:(oh-ih)/2:color=0x5a5550,format=yuv420p', '-frames:v', '20', '-r', '10', y4m]);
  const browser = await puppeteer.launch({
    executablePath: findChrome(), headless: true,
    args: [...WEBGL_FLAGS, '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${y4m}`, '--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 720, height: 960 });
  const logs = [];
  page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') logs.push('[error] ' + m.text()); });
  const t0 = Date.now();
  await page.goto(`${server.url}/?mode=ar`, { waitUntil: 'load' });
  let state = null;
  try {
    await page.waitForFunction('window.__AR_STATE__ && (window.__AR_STATE__.found.length > 0 || window.__AR_STATE__.phase === "error")', { timeout: 180000, polling: 500 });
    await new Promise((r) => setTimeout(r, 2500)); // let the scene render a few frames
  } catch { logs.push('[timeout] no target found within 180 s'); }
  state = await page.evaluate('({ ...window.__AR_STATE__, errors: window.__AR_ERRORS__, caption: document.getElementById("hud-caption").textContent, title: document.getElementById("hud-title").textContent })');
  const ok = state?.found?.[0] === n - 1;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} page ${n}: expected target ${n - 1}, found ${JSON.stringify(state?.found)} phase=${state?.phase} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  console.log(`     title="${state?.title}" caption="${state?.caption}" error=${state?.error ?? 'none'}`);
  for (const l of [...(state?.errors || []).map((e) => '[app] ' + e), ...logs]) console.log('     ' + l);
  if (shotDir) await page.screenshot({ path: resolve(shotDir, `ar-page-${n}.png`) });
  await browser.close();
}
await server.close();
process.exit(failures ? 1 : 0);
