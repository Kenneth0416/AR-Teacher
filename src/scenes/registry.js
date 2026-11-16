// Scene registry: one lazily-loaded module per page, src/scenes/page-XX.js (XX = 01..10).
// Each module's default export is createScene(ctx) - see docs/SCENE_CONTRACT.md.
const modules = import.meta.glob('./page-*.js');

const pad = (n) => String(n).padStart(2, '0');

/** Returns the scene module for page n (number) or 'kit' (the kit demo), or null. */
export async function loadSceneModule(id) {
  if (id === 'kit') return import('./kit-demo.js');
  const loader = modules[`./page-${pad(id)}.js`];
  return loader ? loader() : null;
}

export const hasScene = (id) => id === 'kit' || Boolean(modules[`./page-${pad(id)}.js`]);
