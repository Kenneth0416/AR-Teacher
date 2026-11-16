// PLACEHOLDER scene for page 1 - will be replaced by the real animation.
// Contract: docs/SCENE_CONTRACT.md
export default function createScene(ctx) {
  const { THREE, kit, page, spec } = ctx;
  const group = new THREE.Group();

  // title card floating above the top of the page
  const title = new kit.Label(spec?.title ? kit.chem(spec.title) : 'Page 1', {
    size: 0.04, background: kit.palette.panel, maxWidth: 0.85, border: kit.palette.panelEdge,
  });
  title.position.set(0, page.height / 2 - 0.12, 0.08);
  group.add(title);

  // a simple animated object: a molecule-like cluster orbiting over the page centre
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 32, 16),
    new THREE.MeshStandardMaterial({ color: kit.palette.species[0 % kit.palette.species.length], roughness: 0.35 }),
  );
  const orbit = new THREE.Group();
  const satMat = new THREE.MeshStandardMaterial({ color: kit.palette.white, roughness: 0.4 });
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.022, 20, 12), satMat);
    s.position.set(Math.cos((i * 2 * Math.PI) / 3) * 0.11, Math.sin((i * 2 * Math.PI) / 3) * 0.11, 0);
    orbit.add(s);
  }
  const holder = new THREE.Group();
  holder.add(core, orbit);
  holder.position.set(0, 0, 0.2);
  group.add(holder);

  const captions = kit.captionTrack(ctx, [
    { duration: 3, caption: 'Placeholder scene for page 1' },
    { duration: 3, caption: (f) => `t-loop progress ${Math.round(f * 100)}%` },
  ]);

  return {
    group,
    update(t) {
      orbit.rotation.z = t * 1.2;
      holder.position.z = 0.2 + Math.sin(t * 2) * 0.03;
      core.scale.setScalar(1 + 0.08 * Math.sin(t * 4));
      captions(t);
    },
    dispose() {
      kit.disposeObject(group);
    },
  };
}
