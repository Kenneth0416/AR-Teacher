// Page 7 - Example 2: the iodine clock reaction.
// A 3D beaker of clear solution (H+, I-, S2O3^2-, starch). H2O2 is added; reaction (1) makes I2,
// which a fixed, small amount of S2O3^2- removes at once (reaction (2), 2 S2O3^2- per I2, I-
// regenerated), so the solution stays clear. When ALL the S2O3^2- has been used, the next I2 meets
// starch (reaction (3)) and the whole solution turns dark blue suddenly; the stopwatch stops.
// Finally the beaker shrinks into the book's three-stage picture: clear -> clear -> dark blue.
// Contract: docs/SCENE_CONTRACT.md
export default function createScene(ctx) {
  const { THREE, kit, page } = ctx;
  const { palette } = kit;
  const group = new THREE.Group();
  const S2O3 = kit.chem('S2O3^2-');

  // ---------------------------------------------------------------- timeline
  const STEPS = [
    { duration: 5, caption: `Clear solution: H^+, I^-, ${S2O3} and starch` },
    { duration: 4, caption: `${kit.chem('H2O2')} added: reaction (1) makes ${kit.chem('I2')}` },
    { duration: 8.5, caption: `${S2O3} removes each ${kit.chem('I2')} immediately (reaction (2)): solution stays clear` },
    { duration: 2.5, caption: `All the added ${S2O3} has been consumed` },
    { duration: 5, caption: `Free ${kit.chem('I2')} + starch → dark blue complex (reaction (3)): sudden colour change` },
    { duration: 6, caption: `Fixed amount of ${S2O3}: the time for dark blue to appear measures the rate of reaction (1)` },
    { duration: 5, caption: 'Clear → clear → dark blue as time passes' },
  ];
  const T = kit.totalDuration(STEPS); // 36 s
  const captions = kit.captionTrack(ctx, STEPS);

  // event schedule (seconds in the loop)
  const T_ADD = 6.6;                          // H2O2 reaches the solution: clock starts
  const R1 = [10.0, 12.6, 15.2, 19.6, 25.4];  // reaction (1) events: H2O2 + 2I- + 2H+ -> I2 + 2H2O
  const R2_DT = 0.9;                          // reaction (2) follows each of the first three at once
  const N_R2 = 3;                             // 6 S2O3^2- = 3 x (2 S2O3^2- + I2)
  const T_BLUE = R1[3] + 1.0;                 // first free I2 meets starch -> dark blue
  const T_DOCK2 = R1[4] + 1.0;
  const T_SHRINK = 31;

  // opacity registry (individual fades x global loop fade)
  const faded = [];
  const alpha = new Map();
  const reg = (o) => { faded.push(o); return o; };
  const fade = (o, a) => alpha.set(o, a);

  // ---------------------------------------------------------------- beaker
  const BK = { x: -0.025, y: -0.165, r: 0.115, h: 0.18 };
  const LIQ = 0.14;
  const bk = new THREE.Group();
  bk.position.set(BK.x, BK.y, 0);
  group.add(bk);
  const beaker = new kit.Beaker({ radius: BK.r, height: BK.h, level: LIQ / BK.h, liquidColor: '#eaf4fb', liquidOpacity: 0.22 });
  bk.add(beaker);
  const CLEAR = new THREE.Color('#eaf4fb'), BLUE = new THREE.Color(palette.iodineBlue), tmpC = new THREE.Color();

  // ---------------------------------------------------------------- particles ("actors")
  const SPEC = {
    H2O2: { color: '#3bc9db', r: 0.013 },
    H: { color: '#ff8787', r: 0.0085 },
    I: { color: '#5c7cfa', r: 0.012 },
    S2O3: { color: '#f76707', r: 0.0135 },
    I2: { color: '#8b4513', r: 0.0165 },
    S4O6: { color: '#94d82d', r: 0.015 },
    starch: { color: '#d9b77e', r: 0.0085 },
  };
  const rand = kit.rng(2024);
  const randomHome = () => {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * 0.083;
    return new THREE.Vector3(Math.cos(a) * d, Math.sin(a) * d, 0.025 + rand() * 0.09);
  };
  const sphereGeo = new THREE.SphereGeometry(1, 20, 14);
  const capsuleGeo = new THREE.CapsuleGeometry(0.0085, 0.05, 4, 12);
  const actors = [];
  const mkActor = (kind, { home = randomHome(), born = -1, bornFrom = null, die = Infinity, dieAt = null, approach = 0.7, dock = null } = {}) => {
    const sp = SPEC[kind];
    const mat = new THREE.MeshStandardMaterial({ color: sp.color, roughness: 0.35, transparent: true, depthWrite: true });
    const mesh = kind === 'starch' ? new THREE.Mesh(capsuleGeo, mat) : new THREE.Mesh(sphereGeo, mat);
    if (kind !== 'starch') mesh.scale.setScalar(sp.r);
    else mesh.rotation.z = rand() * Math.PI;
    mesh.renderOrder = 3; // drawn after the liquid (1) and glass (2): the zoomed-in particles stay visible
    bk.add(mesh);
    const a = { kind, mesh, mat, home, born, bornFrom, die, dieAt, approach, dock, ph: [rand() * 6.3, rand() * 6.3, rand() * 6.3], w: [0.9 + rand(), 0.8 + rand(), 0.7 + rand()], base: kind === 'starch' ? 1 : sp.r };
    actors.push(a);
    return a;
  };
  const jig = new THREE.Vector3(), tmpV = new THREE.Vector3();
  const homeAt = (a, t, out) => {
    const amp = a.kind === 'starch' ? 0.004 : 0.009;
    return out.set(
      a.home.x + amp * Math.sin(t * a.w[0] + a.ph[0]),
      a.home.y + amp * Math.sin(t * a.w[1] + a.ph[1]),
      a.home.z + amp * 0.6 * Math.sin(t * a.w[2] + a.ph[2]),
    );
  };
  const posAt = (a, t, out) => {
    homeAt(a, t, out);
    if (a.bornFrom && t < a.born + 0.9) { tmpV.copy(out); out.lerpVectors(a.bornFrom, tmpV, kit.ease.outCubic(kit.invLerp(a.born, a.born + 0.9, t))); }
    if (a.dieAt && t > a.die - a.approach) {
      const target = typeof a.dieAt === 'function' ? a.dieAt(t, jig) : a.dieAt;
      out.lerp(target, kit.ease.inOutCubic(kit.invLerp(a.die - a.approach, a.die, t)));
    }
    if (a.dock && t >= a.dock.t) {
      const s = a.dock.starch;
      homeAt(s, t, out).add(a.dock.offset);
    } else if (a.dock && t > a.dock.t - a.approach) {
      const target = homeAt(a.dock.starch, t, jig).add(a.dock.offset);
      out.lerp(target, kit.ease.inOutCubic(kit.invLerp(a.dock.t - a.approach, a.dock.t, t)));
    }
    return out;
  };

  // reaction sites
  const M1 = [[-0.035, 0.025, 0.07], [0.04, -0.025, 0.08], [0.0, 0.045, 0.06], [-0.03, -0.03, 0.08], [0.035, 0.03, 0.07]].map((p) => new THREE.Vector3(...p));
  const M2 = M1.map((m) => m.clone().add(new THREE.Vector3(0.03, -0.02, 0.005)));

  // starting solution: 12 H+, 6 I-, 6 S2O3^2-, 2 starch
  const starch = [mkActor('starch', { home: new THREE.Vector3(-0.05, -0.04, 0.05) }), mkActor('starch', { home: new THREE.Vector3(0.05, 0.035, 0.05) })];
  const H = Array.from({ length: 12 }, () => mkActor('H'));
  const I = Array.from({ length: 6 }, () => mkActor('I'));
  const S = Array.from({ length: 6 }, () => mkActor('S2O3'));
  // H2O2: 6 small molecules spread from the big drop
  const DROP_C = new THREE.Vector3(0, 0, 0.11);
  const P = Array.from({ length: 6 }, () => mkActor('H2O2', { born: T_ADD, bornFrom: DROP_C }));
  const I2 = [];
  const S4O6 = [];
  R1.forEach((tr, k) => {
    // reaction (1): H2O2 + 2I- + 2H+ meet at M1[k]
    const iA = I[2 * k], iB = I[2 * k + 1];
    for (const a of [P[k], H[2 * k], H[2 * k + 1], iA, iB]) { a.die = tr; a.dieAt = M1[k]; }
    if (k < N_R2) {
      // reaction (2): I2 + 2 S2O3^2- -> S4O6^2- + 2I- at M2[k], immediately
      const t2 = tr + R2_DT;
      I2.push(mkActor('I2', { home: M1[k], born: tr, die: t2, dieAt: M2[k], approach: 0.6 }));
      for (const s of [S[2 * k], S[2 * k + 1]]) { s.die = t2; s.dieAt = M2[k]; s.approach = 0.75; }
      S4O6.push(mkActor('S4O6', { born: t2, bornFrom: M2[k] }));
      I.push(mkActor('I', { born: t2, bornFrom: M2[k] }), mkActor('I', { born: t2, bornFrom: M2[k] }));
    } else {
      // no S2O3^2- left: the I2 stays and docks onto starch -> dark blue complex
      const st = starch[k === N_R2 ? 0 : 1];
      I2.push(mkActor('I2', { home: M1[k], born: tr, dock: { t: tr + 1.0, starch: st, offset: new THREE.Vector3(0, 0, 0.018) }, approach: 0.8 }));
    }
  });

  // big H2O2 drop falling in
  const drop = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: SPEC.H2O2.color, roughness: 0.3, transparent: true }));
  drop.renderOrder = 3;
  bk.add(drop);
  const dropLbl = reg(new kit.Label(kit.chem('H2O2'), { size: 0.03, billboard: true, background: palette.panel, border: SPEC.H2O2.color, weight: 800 }));
  bk.add(dropLbl);

  // floating tags
  const i2Lbl = reg(new kit.Label(kit.chem('I2'), { size: 0.028, billboard: true, background: '#8b4513', color: '#ffffff', weight: 800 }));
  bk.add(i2Lbl);
  const mkTag = (txt, bg) => { const l = reg(new kit.Label(txt, { size: 0.028, billboard: true, background: bg, color: '#ffffff', weight: 800 })); bk.add(l); return l; };
  const tag1 = mkTag('(1)', palette.accent), tag2 = mkTag('(2)', palette.secondary);
  // (3) is white-backed so it reads over the dark blue liquid
  const tag3 = reg(new kit.Label('(3)', { size: 0.028, billboard: true, background: palette.panel, border: palette.iodineBlue, color: palette.iodineBlue, weight: 800 }));
  bk.add(tag3);

  // ---------------------------------------------------------------- printed equations highlighted
  const eqRects = [[0.16, 0.165, 0.85, 0.2], [0.18, 0.312, 0.82, 0.345], [0.2, 0.43, 0.78, 0.462]].map((b, i) => {
    const r = reg(new kit.HighlightRect(page.bboxToRect(b), { color: [palette.accent, palette.secondary, palette.primary][i], fillOpacity: 0.2, lineWidth: 0.006 }));
    group.add(r);
    return r;
  });

  // ---------------------------------------------------------------- legend (right of the beaker)
  const legend = reg(new THREE.Group());
  const LEG = [
    ['H2O2', kit.chem('H2O2')], ['H', 'H^+'], ['I', 'I^-'], ['S2O3', S2O3], ['I2', kit.chem('I2')], ['S4O6', kit.chem('S4O6^2-')], ['starch', 'starch'],
  ];
  const legItems = {};
  LEG.forEach(([k, txt], i) => {
    const y = 0.025 - i * 0.05;
    const g = new THREE.Group();
    const icon = k === 'starch'
      ? new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.022, 4, 10), new THREE.MeshStandardMaterial({ color: SPEC.starch.color, roughness: 0.4 }))
      : new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: SPEC[k].color, roughness: 0.35 }));
    if (k !== 'starch') icon.scale.setScalar(Math.max(0.009, SPEC[k].r * 0.85));
    else icon.rotation.z = Math.PI / 2;
    icon.position.set(0.215, y, 0.03);
    const l = new kit.Label(txt, { size: 0.026, billboard: true, align: 'left', background: palette.panel, bgOpacity: 0.85, weight: 700 });
    l.position.set(0.24, y, 0.03);
    g.add(icon, l);
    legend.add(g);
    legItems[k] = reg(g);
  });
  group.add(legend);

  // ---------------------------------------------------------------- S2O3 counter + stopwatch (left)
  const counter = reg(new kit.Label(`${S2O3} left: 6`, { size: 0.03, billboard: true, background: palette.panel, border: SPEC.S2O3.color, weight: 800, align: 'left' }));
  counter.position.set(-0.4, -0.29, 0.04);
  group.add(counter);
  const cross = reg(new kit.Label('X', { size: 0.06, billboard: true, color: palette.danger, weight: 900, haloColor: '#ffffff' }));
  cross.position.set(-0.435, -0.29, 0.06);
  group.add(cross);
  const crossIcon = reg(new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: SPEC.S2O3.color, roughness: 0.35 })));
  crossIcon.scale.setScalar(0.016);
  crossIcon.position.set(-0.435, -0.29, 0.06);
  group.add(crossIcon);

  const SW = { x: -0.36, y: -0.03, z: 0.11, r: 0.06 };
  const sw = reg(new THREE.Group());
  sw.position.set(SW.x, SW.y, SW.z);
  sw.rotation.x = 0.4;
  const basic = (c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide, toneMapped: false });
  const face = new THREE.Mesh(new THREE.CircleGeometry(SW.r, 48), basic('#ffffff'));
  const ring = new THREE.Mesh(new THREE.RingGeometry(SW.r, SW.r * 1.14, 48), basic('#343a40'));
  ring.position.z = 0.0005;
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.016, 0.01), basic('#343a40'));
  crown.position.set(0, SW.r * 1.14 + 0.007, 0);
  sw.add(face, ring, crown);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const tick = new THREE.Mesh(new THREE.PlaneGeometry(k % 3 === 0 ? 0.004 : 0.0025, k % 3 === 0 ? 0.014 : 0.008), basic('#343a40'));
    tick.position.set(Math.sin(a) * SW.r * 0.86, Math.cos(a) * SW.r * 0.86, 0.001);
    tick.rotation.z = -a;
    sw.add(tick);
  }
  const hand = new THREE.Group();
  const handMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.004, SW.r * 0.82), basic(palette.danger));
  handMesh.position.y = SW.r * 0.41;
  hand.add(handMesh);
  hand.position.z = 0.0015;
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.006, 16), basic(palette.danger));
  cap.position.z = 0.002;
  sw.add(hand, cap);
  group.add(sw);
  const swLbl = reg(new kit.Label('', { size: 0.026, billboard: true, background: palette.panel, border: palette.panelEdge, weight: 700, lineHeight: 1.15 }));
  swLbl.position.set(SW.x + 0.02, SW.y - 0.12, 0.04);
  group.add(swLbl);

  // ---------------------------------------------------------------- final: book's three-stage picture
  const STAGE_X = [-0.285, -0.025, 0.235];
  const STAGE_Y = -0.155;
  const minis = [0, 1].map((i) => {
    const m = reg(new kit.Beaker({ radius: BK.r * 0.5, height: BK.h * 0.5, level: LIQ / BK.h, liquidColor: '#eaf4fb', liquidOpacity: 0.3 }));
    m.position.set(STAGE_X[i], STAGE_Y, 0);
    group.add(m);
    return m;
  });
  // a few particles in the mini beakers (H2O2 drop over the first; I2 + S2O3 in the second)
  const miniDeco = reg(new THREE.Group());
  const deco = (kind, x, y, z, s = 1) => { const m = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: SPEC[kind].color, roughness: 0.35 })); m.scale.setScalar(SPEC[kind].r * s); m.position.set(x, y, z); miniDeco.add(m); };
  deco('H2O2', STAGE_X[0], STAGE_Y, 0.15, 1.6);
  deco('I2', STAGE_X[1] + 0.012, STAGE_Y, 0.045, 0.8);
  deco('S2O3', STAGE_X[1] - 0.016, STAGE_Y + 0.01, 0.04, 0.8);
  deco('S2O3', STAGE_X[1] - 0.02, STAGE_Y - 0.012, 0.05, 0.8);
  group.add(miniDeco);
  const timeArrow = reg(new kit.Arrow({ from: [-0.39, 0.015, 0.025], to: [0.34, 0.015, 0.025], color: palette.inkSoft, radius: 0.005, headLength: 0.04, headRadius: 0.016 }));
  group.add(timeArrow);
  const stageLbls = [kit.chem('H2O2 added'), `${S2O3} removes ${kit.chem('I2')}`, `${S2O3} used up`].map((txt, i) => {
    const l = reg(new kit.Label(txt, { size: 0.023, billboard: true, background: palette.panel, border: palette.panelEdge, weight: 700 }));
    l.position.set(STAGE_X[i], STAGE_Y + 0.07, 0.115);
    group.add(l);
    return l;
  });

  const p = new THREE.Vector3();
  let countShown = -1;
  let swState = '';

  return {
    group,
    update(t) {
      const lt = kit.loop(t, T);
      captions(t);
      alpha.clear();
      const G = Math.min(kit.invLerp(0, 0.5, lt), 1 - kit.invLerp(T - 0.6, T, lt));

      // ---- liquid: clear until the first free I2 meets starch, then dark blue within ~0.3 s
      const blue = kit.smoothstep(T_BLUE, T_BLUE + 0.3, lt);
      kit.setOpacity(beaker, G);
      tmpC.copy(CLEAR).lerp(BLUE, blue);
      beaker.setLiquidColor(tmpC).setLiquidOpacity(kit.lerp(0.22, 0.9, blue) * G);

      // ---- particles
      for (const a of actors) {
        const alive = lt >= a.born && lt < a.die;
        a.mesh.visible = alive && G > 0.001;
        if (!a.mesh.visible) continue;
        posAt(a, lt, a.mesh.position);
        const grow = a.born > 0 ? kit.ease.outBack(kit.invLerp(a.born, a.born + 0.3, lt)) : 1;
        const shrink = 1 - kit.invLerp(a.die - 0.12, a.die, lt);
        if (a.kind === 'starch') a.mesh.scale.setScalar(Math.max(1e-3, grow * shrink));
        else a.mesh.scale.setScalar(Math.max(1e-4, a.base * grow * shrink));
        a.mat.opacity = G;
      }
      // starch-iodine complex turns blue-black
      starch[0].mat.color.set(lt >= T_BLUE ? palette.iodineBlue : SPEC.starch.color);
      starch[1].mat.color.set(lt >= T_DOCK2 ? palette.iodineBlue : SPEC.starch.color);

      // ---- H2O2 drop
      const dIn = kit.invLerp(5.2, 5.5, lt), dFall = kit.ease.inQuad(kit.invLerp(5.4, T_ADD, lt));
      const dOut = 1 - kit.invLerp(T_ADD, T_ADD + 0.25, lt);
      drop.visible = lt >= 5.2 && lt < T_ADD + 0.25 && G > 0.001;
      drop.position.set(0, 0, kit.lerp(0.42, DROP_C.z, dFall));
      drop.scale.setScalar(0.028 * dIn * dOut);
      drop.material.opacity = G;
      dropLbl.position.set(0.0, 0.05, drop.position.z + 0.02);
      fade(dropLbl, kit.envelope(lt, 5.2, T_ADD + 0.3, 0.25));

      // ---- tags and I2 label
      let i2Show = 0;
      I2.forEach((a, k) => {
        if (lt >= a.born && lt < Math.min(a.die, a.dock ? a.dock.t - 0.1 : Infinity, a.born + 1.3)) { i2Show = 1; posAt(a, lt, p); i2Lbl.position.set(p.x + 0.04, p.y, p.z + 0.035); }
      });
      fade(i2Lbl, i2Show);
      let a1 = 0, a2 = 0, a3 = 0;
      R1.forEach((tr, k) => {
        if (lt >= tr - 0.05 && lt < tr + 0.8) { a1 = 1; tag1.position.set(M1[k].x - 0.06, M1[k].y, M1[k].z + 0.04); }
        if (k < N_R2 && lt >= tr + R2_DT - 0.05 && lt < tr + R2_DT + 0.8) { a2 = 1; tag2.position.set(M2[k].x + 0.03, M2[k].y, M2[k].z + 0.05); }
      });
      for (const [td, st] of [[T_BLUE, starch[0]], [T_DOCK2, starch[1]]]) {
        if (lt >= td - 0.05 && lt < td + 1.4) { a3 = 1; homeAt(st, lt, p); tag3.position.set(p.x, p.y - 0.035, p.z + 0.06); }
      }
      fade(tag1, a1); fade(tag2, a2); fade(tag3, a3);

      // ---- printed equations: highlight the one in action
      const inR1 = R1.some((tr) => lt >= tr - 0.7 && lt < tr + 0.4);
      const inR2 = R1.slice(0, N_R2).some((tr) => lt >= tr + 0.4 && lt < tr + R2_DT + 0.6);
      const inR3 = lt >= T_BLUE - 0.1 && lt < T_SHRINK;
      const summary = lt >= 26 && lt < T_SHRINK ? 0.45 : 0;
      fade(eqRects[0], Math.max(inR1 ? 1 : 0, summary));
      fade(eqRects[1], Math.max(inR2 ? 1 : 0, summary));
      fade(eqRects[2], inR3 ? 1 : 0);
      eqRects.forEach((r) => r.update(t));

      // ---- legend: product entries appear when the products first form
      const legA = 1 - kit.invLerp(T_SHRINK, T_SHRINK + 0.5, lt);
      for (const k of Object.keys(legItems)) fade(legItems[k], legA * (k === 'I2' ? kit.invLerp(R1[0], R1[0] + 0.4, lt) : k === 'S4O6' ? kit.invLerp(R1[0] + R2_DT, R1[0] + R2_DT + 0.4, lt) : 1));

      // ---- counter
      const used = R1.slice(0, N_R2).filter((tr) => lt >= tr + R2_DT).length;
      const left = 6 - 2 * used;
      if (left !== countShown) { countShown = left; counter.setText(`${S2O3} left: ${left}`); }
      const tZero = R1[N_R2 - 1] + R2_DT;
      const xA = kit.invLerp(tZero, tZero + 0.3, lt);
      fade(counter, legA);
      fade(crossIcon, legA * (1 - 0.5 * xA));
      fade(cross, legA * xA);

      // ---- stopwatch: starts when H2O2 is added, stops at the sudden colour change
      const swA = kit.invLerp(T_ADD - 0.8, T_ADD - 0.3, lt) * legA;
      fade(sw, swA); fade(swLbl, swA);
      const run = kit.clamp(lt, T_ADD, T_BLUE) - T_ADD;
      hand.rotation.z = -(run / 10) * Math.PI * 2; // schematic dial (no numbers: times depend on the mixture)
      const st = lt < T_ADD ? 'ready' : lt < T_BLUE ? 'timing...' : 'stop: t = time for\ndark blue to appear';
      if (st !== swState) { swState = st; swLbl.setText(st); swLbl.setColor(lt >= T_BLUE ? palette.iodineBlue : palette.ink); }

      // ---- final: beaker shrinks into the third stage of the book's picture
      const sh = kit.ease.inOutCubic(kit.invLerp(T_SHRINK, T_SHRINK + 1.5, lt));
      bk.position.set(kit.lerp(BK.x, STAGE_X[2], sh), kit.lerp(BK.y, STAGE_Y, sh), 0);
      bk.scale.setScalar(kit.lerp(1, 0.5, sh));
      const mA = kit.invLerp(T_SHRINK + 0.8, T_SHRINK + 1.4, lt);
      minis.forEach((m) => { fade(m, mA); });
      fade(miniDeco, mA);
      timeArrow.setProgress(kit.tween(lt, T_SHRINK + 1.2, 1.2));
      fade(timeArrow, lt >= T_SHRINK + 1.2 ? 1 : 0);
      stageLbls.forEach((l, i) => fade(l, kit.invLerp(T_SHRINK + 2.0 + 0.4 * i, T_SHRINK + 2.4 + 0.4 * i, lt)));

      for (const o of faded) kit.setOpacity(o, (alpha.has(o) ? alpha.get(o) : 1) * G);
      for (const m of minis) m.setLiquidOpacity(0.3 * mA * G);
    },
    dispose() {
      kit.disposeObject(group);
    },
  };
}
