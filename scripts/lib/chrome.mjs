// Locate a local Chrome/Chromium for puppeteer-core and provide headless WebGL-friendly flags.
import { existsSync } from 'node:fs';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean);

export function findChrome() {
  const p = CANDIDATES.find((c) => existsSync(c));
  if (!p) throw new Error('Chrome not found. Set CHROME_PATH=/path/to/chrome');
  return p;
}

export const WEBGL_FLAGS = [
  '--no-sandbox',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
  '--enable-webgl',
];
