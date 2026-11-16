import { chem } from './kit/text.js';

// Page metadata shared by AR mode, preview mode and the target compiler.
// Target index i in public/targets/pages.mind  <->  page number i + 1.

const images = import.meta.glob('../assets/pages/page-*.jpg', { eager: true, query: '?url', import: 'default' });
const specs = import.meta.glob('../content/pages/page-*.json', { import: 'default' });

const num = (path) => Number(path.match(/page-(\d+)/)[1]);

/** Image URLs ordered by page number (index 0 = page 1). */
export const PAGE_IMAGES = Object.keys(images).sort((a, b) => num(a) - num(b)).map((k) => images[k]);
export const PAGE_COUNT = PAGE_IMAGES.length;

/** Page aspect: height / width of the printed page (612 x 792 pt letter; images 1105 x 1430). */
export const PAGE_ASPECT = 792 / 612; // 1.294

const pad = (n) => String(n).padStart(2, '0');

export function pageImage(n) {
  return PAGE_IMAGES[n - 1] ?? null;
}

/** Load content/pages/page-XX.json if it exists (bundled at build time), else null. */
export async function loadSpec(n) {
  const key = `../content/pages/page-${pad(n)}.json`;
  if (!specs[key]) return null;
  try {
    return await specs[key]();
  } catch (e) {
    console.warn(`[pages] failed to load spec for page ${n}`, e);
    return null;
  }
}

export function pageTitle(n, spec) {
  if (n === 'kit') return 'Scene kit demo';
  return spec?.title ? `p.${n} · ${chem(spec.title)}` : `Page ${n}`;
}
