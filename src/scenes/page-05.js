// Page 5 - Example 1: Na2S2O3 + acid, the "disappearing cross" experiment.
// Six tubes (same 20.0 cm3 of 0.5 M H2SO4, 5.0-30.0 cm3 of 0.1 M Na2S2O3, water to 50.0 cm3) stand
// on the table. On a shared, visibly compressed clock (x10) yellow sulphur clouds each tube until
// the cross under it disappears (tube 6 at 30 s ... tube 1 at 181 s). Then 1/t bars show that the
// shortest time means the fastest initial rate, and the water column is explained.
// Contract: docs/SCENE_CONTRACT.md
export default function createScene(ctx) {
  const { THREE, kit, page } = ctx;
  const { palette } = kit;
  const group = new THREE.Group();

  // ---------------------------------------------------------------- data (page 5 table)
  const ROWS = [
    { n: 1, acid: 20.0, na: 5.0, water: 25.0, time: 181 },
    { n: 2, acid: 20.0, na: 10.0, water: 20.0, time: 91 },
    { n: 3, acid: 20.0, na: 15.0, water: 15.0, time: 61 },
    { n: 4, acid: 20.0, na: 20.0, water: 10.0, time: 45 },
    { n: 5, acid: 20.0, na: 25.0, water: 5.0, time: 36 },
    { n: 6, acid: 20.0, na: 30.0, water: 0.0, time: 30 },
  ];
  ROWS.forEach((r) => { r.inv = 1 / r.time; r.invStr = r.inv.toPrecision(2); }); // 0.0055 ... 0.028, 0.033
  const SPEED = 10;          // experiment seconds per animation second
  const T_END = 181;         // the clock stops when the last cross (tube 1) disappears
  const NA = kit.chem('Na2S2O3');

  // ---------------------------------------------------------------- timeline
  const STEPS = [
    { duration: 6, caption: `Same acid (20.0 cm^3); different ${NA} volume; water makes every tube 50.0 cm^3` },
    { duration: 4, caption: kit.chem('S2O3^2-(aq) + 2H^+(aq) -> S(s) + SO2(g) + H2O(l): yellow sulphur precipitate forms') },
    { duration: 20, caption: () => 'Clock runs 10× faster: time for the sulphur to blot out the cross' },
    { duration: 5, caption: 'Shorter time = faster reaction: initial rate ∝ 1/t (approximately; rate ≠ 1/t)' },
    { duration: 5, caption: `Distilled water keeps total volume and [H_2SO_4] constant: only [${NA}] varies` },
  ];
  const T = kit.totalDuration(STEPS); // 40 s
  const captions = kit.captionTrack(ctx, STEPS);
  const S_RUN = 10; // start of the timed run (step 3)
  // experiment time on the shared clock (pure function of looped time)
  const tau = (lt) => kit.clamp((lt - S_RUN - 0.5) * SPEED, 0, T_END);

  // ---------------------------------------------------------------- opacity registry (global loop fade)
  const faded = [];
  const alpha = new Map();
  const reg = (o) => { faded.push(o); return o; };
  const fade = (o, a) => alpha.set(o, a);

  // ---------------------------------------------------------------- layout
  const TUBE_Y = 0.06;
  const TUBE_R = 0.033;
  const TUBE_H = 0.26;
  const LIQ_H = 0.19;            // 50.0 cm3 in every tube
  const LEVEL = LIQ_H / TUBE_H;
  const xOf = (i) => -0.2 + i * 0.12;
  const COL = { acid: '#f08c8c', na: '#4dabf7', water: '#e7f5ff', clear: '#e3f2fb', cloud: '#efd36b' };

  // rack: two rails + four posts (kept outside the tube footprints so the crosses stay visible)
  const rackMat = new THREE.MeshStandardMaterial({ color: '#b08968', roughness: 0.7 });
  const rack = reg(new THREE.Group());
  const railLen = xOf(5) - xOf(0) + 0.12;
  for (const dy of [-0.045, 0.045]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.012, 0.012), rackMat);
    rail.position.set((xOf(0) + xOf(5)) / 2, TUBE_Y + dy, 0.1);
    rack.add(rail);
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.1), rackMat);
      post.position.set((xOf(0) + xOf(5)) / 2 + sx * railLen / 2, TUBE_Y + dy, 0.05);
      rack.add(post);
    }
  }
  group.add(rack);

  const tubes = ROWS.map((r, i) => {
    const x = xOf(i);
    const tg = new THREE.Group();
    tg.position.set(x, TUBE_Y, 0);
    group.add(tg);
    // white card with the reference mark 'X' under the tube
    const card = reg(new kit.Panel({ width: 0.066, height: 0.066, color: '#ffffff', opacity: 1, radius: 0.006 }));
    card.position.z = 0.002;
    tg.add(card);
    const crossMat = [];
    const cross = new THREE.Group();
    for (const s of [-1, 1]) {
      const rib = new kit.Ribbon([[-0.021, -0.021 * s], [0.021, 0.021 * s]], { width: 0.007, color: palette.ink, opacity: 0.999 });
      rib.renderOrder = 0;
      crossMat.push(rib.material);
      cross.add(rib);
    }
    cross.position.z = 0.0035;
    tg.add(cross);
    // vessel (flat-bottomed tube so we can look straight down at the cross)
    const v = new kit.Beaker({ radius: TUBE_R, height: TUBE_H, level: LEVEL, liquidColor: COL.clear, liquidOpacity: 0.28 });
    tg.add(v);
    // colour-coded layers (only in step 1): acid / Na2S2O3 / water, heights proportional to volume
    const layers = reg(new THREE.Group());
    let z = 0.001;
    for (const [vol, c] of [[r.acid, COL.acid], [r.na, COL.na], [r.water, COL.water]]) {
      if (vol <= 0) continue;
      const h = (vol / 50) * (LIQ_H - 0.001);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(TUBE_R - 0.001, TUBE_R - 0.001, h, 32),
        new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.8, roughness: 0.4, depthWrite: false }));
      m.rotation.x = Math.PI / 2;
      m.position.z = z + h / 2;
      m.renderOrder = 1;
      layers.add(m);
      z += h;
    }
    tg.add(layers);
    // sulphur specks (precipitate), revealed with the cloudiness
    const NS = 46;
    const rand = kit.rng(11 + i * 7);
    const specks = reg(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6),
      new THREE.MeshStandardMaterial({ color: '#e2b714', roughness: 0.5 }), NS));
    specks.frustumCulled = false;
    const sp = Array.from({ length: NS }, () => ({ a: rand() * 6.283, d: Math.sqrt(rand()) * (TUBE_R - 0.006), z: 0.006 + rand() * (LIQ_H - 0.012), ph: rand() * 6.283, s: 0.0022 + rand() * 0.0016 }));
    tg.add(specks);
    // tube number on the paper in front of the tube
    const num = reg(new kit.Label(String(r.n), { size: 0.032, weight: 800, color: palette.ink, background: palette.panel, border: palette.panelEdge }));
    num.position.set(0, -0.07, 0.006);
    tg.add(num);
    // per-tube billboard tag (volume / time / water), offset behind the tube so it never covers the opening
    const tag = reg(new kit.Label('', { size: 0.028, billboard: true, background: palette.panel, color: palette.primary, weight: 700 }));
    tag.position.set(0, 0.075, TUBE_H + 0.05);
    tg.add(tag);
    return { r, v, layers, specks, sp, crossMat, tag, tagColor: palette.primary };
  });

  // dashed '50.0 cm3' level rod in front of the tubes (step 1)
  const levelGrp = reg(new THREE.Group());
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, xOf(5) - xOf(0) + 0.1, 8), new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true }));
  rod.rotation.z = Math.PI / 2;
  rod.position.set((xOf(0) + xOf(5)) / 2, TUBE_Y - TUBE_R - 0.006, LIQ_H);
  levelGrp.add(rod);
  const levelLbl = new kit.Label('50.0 cm^3', { size: 0.026, billboard: true, background: palette.accent, color: '#ffffff', align: 'right' });
  levelLbl.position.set(xOf(0) - 0.055, TUBE_Y - TUBE_R - 0.006, LIQ_H);
  levelGrp.add(levelLbl);
  group.add(levelGrp);

  // row header for the per-tube tags
  const header = reg(new kit.Label('', { size: 0.026, billboard: true, align: 'right', color: palette.inkSoft, weight: 700 }));
  header.position.set(xOf(0) - 0.075, TUBE_Y + 0.075, TUBE_H + 0.05);
  group.add(header);

  // legend (step 1)
  const legend = reg(new THREE.Group());
  const lgTitle = new kit.Label('Every tube: total volume = 50.0 cm^3', { size: 0.03, billboard: true, background: palette.panel, border: palette.panelEdge });
  lgTitle.position.set(0.1, 0.545, 0.05);
  legend.add(lgTitle);
  const chips = [
    [`20.0 cm^3 0.5 M ${kit.chem('H2SO4')}`, '#e03131', '#ffffff', -0.17],
    [`0.1 M ${NA}`, palette.primary, '#ffffff', 0.09],
    ['water', '#e7f5ff', palette.ink, 0.29],
  ];
  for (const [txt, bg, fg, x] of chips) {
    const c = new kit.Label(txt, { size: 0.027, billboard: true, background: bg, color: fg, border: palette.panelEdge, bgOpacity: 0.95 });
    c.position.set(x, 0.47, 0.05);
    legend.add(c);
  }
  group.add(legend);

  // equation highlight on the printed equation + "yellow precipitate" note (steps 2-3)
  const eqRect = reg(new kit.HighlightRect(page.bboxToRect([0.27, 0.115, 0.73, 0.155]), { color: palette.accent, fillOpacity: 0.2 }));
  group.add(eqRect);
  const sNote = reg(new THREE.Group());
  const sBall = new THREE.Mesh(new THREE.SphereGeometry(0.014, 20, 14), new THREE.MeshStandardMaterial({ color: '#e2b714', roughness: 0.5 }));
  sBall.position.set(0.265, 0.472, 0.03);
  const sLbl = new kit.Label('S(s): yellow\nprecipitate', { size: 0.026, billboard: true, background: palette.panel, border: palette.panelEdge, align: 'left' });
  sLbl.position.set(0.285, 0.472, 0.03);
  sNote.add(sBall, sLbl);
  group.add(sNote);

  // ---------------------------------------------------------------- stopwatch (shared clock)
  const SW = { x: -0.385, y: -0.05, z: 0.11, r: 0.062 };
  const sw = reg(new THREE.Group());
  sw.position.set(SW.x, SW.y, SW.z);
  sw.rotation.x = 0.4; // tilted: readable from the front view and from above
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
  const readout = reg(new kit.Label('t = 0 s', { size: 0.036, billboard: true, background: palette.panel, border: palette.panelEdge, weight: 800 }));
  readout.position.set(SW.x, SW.y - 0.105, 0.035);
  group.add(readout);
  const badge = reg(new kit.Label('clock ×10', { size: 0.026, billboard: true, background: palette.accent, color: '#ffffff', weight: 800 }));
  badge.position.set(SW.x, SW.y - 0.16, 0.025);
  group.add(badge);

  // ---------------------------------------------------------------- 1/t bars (step 4) lying on the page
  const BAR_Y0 = -0.035;
  const BAR_SCALE = 0.2 / (1 / 30); // 0.2 page units for 1/t = 0.033 s^-1
  const barMat = new THREE.MeshStandardMaterial({ color: palette.secondary, roughness: 0.55 });
  const bars = ROWS.map((r, i) => {
    const b = reg(new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.012), barMat.clone()));
    b.position.set(xOf(i), BAR_Y0, 0.007);
    group.add(b);
    const L = r.inv * BAR_SCALE;
    const lbl = reg(new kit.Label(r.invStr, { size: 0.027, background: palette.panel, border: palette.panelEdge, weight: 700, color: '#c2410c' }));
    lbl.position.set(xOf(i), BAR_Y0 - L - 0.024, 0.016);
    group.add(lbl);
    return { b, L, lbl };
  });
  barMat.dispose();
  const barHead = reg(new kit.Label('1/t (s^-1)', { size: 0.03, background: palette.panel, border: palette.panelEdge, color: '#c2410c', weight: 800 }));
  barHead.position.set(SW.x + 0.01, -0.28, 0.016);
  group.add(barHead);
  // the printed conclusion 'initial rate ∝ 1/t' is highlighted rather than repeated
  const rateNote = reg(new kit.HighlightRect(page.bboxToRect([0.445, 0.682, 0.635, 0.718]), { color: palette.secondary, fillOpacity: 0.22, lineWidth: 0.007 }));
  group.add(rateNote);

  // ---------------------------------------------------------------- step 5: water column note + table highlights
  const naRect = reg(new kit.HighlightRect(page.bboxToRect([0.355, 0.268, 0.526, 0.508]), { color: palette.primary, fillOpacity: 0.16 }));
  const wRect = reg(new kit.HighlightRect(page.bboxToRect([0.528, 0.268, 0.667, 0.508]), { color: '#0c8599', fillOpacity: 0.18 }));
  group.add(naRect, wRect);
  // the printed note on why distilled water is added (blue box) is highlighted
  const waterNote = reg(new kit.HighlightRect(page.bboxToRect([0.215, 0.722, 0.87, 0.835]), { color: '#0c8599', fillOpacity: 0.16, lineWidth: 0.007 }));
  group.add(waterNote);

  const setTag = (tb, text, color) => {
    if (tb.tagColor !== color) { tb.tagColor = color; tb.tag.setColor(color); }
    tb.tag.setText(text);
  };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
  const cClear = new THREE.Color(COL.clear), cCloud = new THREE.Color(COL.cloud), tmpC = new THREE.Color();

  return {
    group,
    update(t) {
      const lt = kit.loop(t, T);
      const s = captions(t);
      const step = s.index;
      alpha.clear();
      const G = Math.min(kit.invLerp(0, 0.5, lt), 1 - kit.invLerp(T - 0.6, T, lt)); // loop fade
      const ts = tau(lt);

      // mixing (step 2): layers -> uniform clear liquid
      const mix = kit.smoothstep(S_RUN - 3.6, S_RUN - 2.4, lt);
      tubes.forEach((tb, i) => {
        const c = kit.clamp(ts / tb.r.time); // cloudiness: reaches 1 exactly when the cross disappears
        const op = kit.lerp(0.28, 0.97, Math.pow(c, 1.3));
        tmpC.copy(cClear).lerp(cCloud, Math.min(1, c * 1.15));
        kit.setOpacity(tb.v, G);
        tb.v.setLiquidColor(tmpC).setLiquidOpacity(op * mix * G);
        fade(tb.layers, 1 - mix);
        const crossA = 1 - kit.smoothstep(0.65, 1.0, c);
        for (const m of tb.crossMat) m.opacity = crossA * G;
        // specks
        const n = Math.round(c * tb.sp.length);
        tb.sp.forEach((p, k) => {
          const sc = k < n ? p.s : 0;
          pv.set(Math.cos(p.a) * p.d + Math.sin(t * 0.7 + p.ph) * 0.002, Math.sin(p.a) * p.d + Math.cos(t * 0.6 + p.ph) * 0.002, p.z + Math.sin(t * 0.5 + p.ph) * 0.003);
          m4.compose(pv, q, sv.set(sc, sc, sc));
          tb.specks.setMatrixAt(k, m4);
        });
        tb.specks.instanceMatrix.needsUpdate = true;
        // per-tube tag
        if (step <= 1) { setTag(tb, tb.r.na.toFixed(1), palette.primary); fade(tb.tag, kit.invLerp(0.4 + i * 0.15, 0.9 + i * 0.15, lt) * (1 - kit.invLerp(S_RUN - 0.6, S_RUN - 0.1, lt))); }
        else if (step <= 3) {
          setTag(tb, `${tb.r.time} s`, palette.ink);
          const tDone = S_RUN + 0.5 + tb.r.time / SPEED;
          fade(tb.tag, kit.invLerp(tDone, tDone + 0.25, lt));
          tb.tag.scale.setScalar(1 + 0.35 * (1 - kit.ease.outCubic(kit.invLerp(tDone, tDone + 0.5, lt))) * (lt >= tDone ? 1 : 0));
        } else { setTag(tb, tb.r.water.toFixed(1), '#0b7285'); tb.tag.scale.setScalar(1); fade(tb.tag, kit.invLerp(35, 35.5, lt)); }
        if (step <= 1) tb.tag.scale.setScalar(1);
        // bars
        const grow = kit.tween(lt, 30.3 + i * 0.25, 1.0, kit.ease.outCubic);
        const bL = Math.max(1e-4, tb.r.inv * BAR_SCALE * grow);
        bars[i].b.scale.y = bL;
        bars[i].b.position.y = BAR_Y0 - bL / 2;
        fade(bars[i].b, kit.invLerp(30, 30.3, lt));
        fade(bars[i].lbl, kit.invLerp(31.0 + i * 0.25, 31.4 + i * 0.25, lt));
      });

      // header text per phase
      if (step <= 1) { header.setText(`${NA} / cm^3`); fade(header, kit.invLerp(0.3, 0.8, lt) * (1 - kit.invLerp(S_RUN - 0.6, S_RUN - 0.1, lt))); }
      else if (step <= 3) { header.setText('time / s'); fade(header, kit.invLerp(S_RUN + 3, S_RUN + 3.5, lt)); }
      else { header.setText('water / cm^3'); fade(header, kit.invLerp(35, 35.5, lt)); }

      fade(levelGrp, kit.envelope(lt, 1.5, S_RUN - 3.6, 0.4));
      fade(legend, kit.envelope(lt, 0.6, 6.2, 0.4));
      fade(eqRect, kit.envelope(lt, 6.2, 30, 0.4));
      fade(sNote, kit.envelope(lt, 6.6, 30, 0.4));
      eqRect.update(t);

      // stopwatch
      const swA = kit.invLerp(6.8, 7.3, lt);
      fade(sw, swA); fade(readout, swA); fade(badge, swA);
      hand.rotation.z = -(ts / 60) * Math.PI * 2; // one turn = 60 s
      readout.setText(`t = ${Math.floor(ts)} s`);

      // bars notes
      fade(barHead, kit.invLerp(30.2, 30.7, lt));
      fade(rateNote, kit.invLerp(32.2, 32.8, lt) * (1 - kit.invLerp(34.8, 35.2, lt)));
      rateNote.update(t * 1.3); waterNote.update(t);
      // step 5
      const w = kit.invLerp(35, 35.5, lt);
      fade(naRect, w); fade(wRect, w); fade(waterNote, kit.invLerp(35.3, 35.8, lt));
      naRect.update(t * 1.6); wRect.update(t);

      for (const o of faded) kit.setOpacity(o, (alpha.has(o) ? alpha.get(o) : 1) * G);
    },
    dispose() {
      kit.disposeObject(group);
    },
  };
}
