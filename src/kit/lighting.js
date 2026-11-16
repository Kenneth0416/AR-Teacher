// Lighting rig. The runtime adds ONE rig inside the page root (the AR anchor / preview page group),
// so lighting is page-relative and identical in AR and preview. Scenes normally add no lights.
// Soft hemisphere ("sky" = out of the page) + key light from above the reader's shoulder (+Z, -Y)
// + weak rim light from the top of the page.
export function createLightingRig(THREE) {
  const rig = new THREE.Group();
  rig.name = 'kit-lighting';
  const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa0aa, 1.7);
  hemi.position.set(0, 0, 1);
  const target = new THREE.Object3D();
  rig.add(target);
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(0.6, -1.0, 2.0);
  key.target = target;
  const rim = new THREE.DirectionalLight(0xffffff, 0.5);
  rim.position.set(-0.5, 1.2, 0.8);
  rim.target = target;
  rig.add(hemi, key, rim);
  return rig;
}
