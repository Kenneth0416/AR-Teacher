// Page 3 - C. Method of initial rate, I) Graphical method (2H2O2 -> 2H2O + O2, MnO2 catalyst).
// 3D bench standing on the upper half of the page (the graphical-method text and the handwritten
// "method of finding initial rate" stay visible): conical flask of H2O2(aq) with a small tube of
// MnO2(s) hung from the bung, delivery tube, gas syringe. When the MnO2 is tipped in, the clock
// starts at t = 0, O2 pushes the plunger out and a tilted graph panel traces volume of O2 against
// time; a tangent at t = 0 gives the initial rate. The run is repeated for lower [H2O2].
// All values are schematic (page 3 has no numeric data): no numbers on the axes or the syringe.
// Contract: docs/SCENE_CONTRACT.md
export default function createScene(ctx) {
  const { THREE, kit } = ctx;
  const P = kit.palette;
  const group = new THREE.Group();

  const STEPS = [
    { duration: 5, caption: kit.chem('H2O2(aq) with MnO2(s); O2(g) collected in a gas syringe') },
    { duration: 4, caption: kit.chem('Time starts at t = 0 s when MnO2 is added') },
    { duration: 8, caption: 'Volume of oxygen collected is plotted against time' },
    { duration: 7, caption: 'Draw a tangent at t = 0 and find its slope' },
    { duration: 8, caption: kit.chem('Repeat with different initial concentrations of H2O2') },
  ];
  const captions = kit.captionTrack(ctx, STEPS);
  const T = kit.totalDuration(STEPS); // 32 s
  const S = []; { let s = 0; for (const st of STEPS) { S.push(s); s += st.duration; } }

  // ---------------------------------------------------------------- schematic kinetics
  // Run r: V(x) = c_r * VMAX * (1 - e^(-x / TAU)), x = 0..1 is the plotted time window.
  // Steepest at t = 0, levels off at a volume proportional to the initial amount of H2O2.
  const VMAX = 0.9, TAU = 0.32;
  const RUNS = [
    { c: 1.0, name: 'higher', color: P.primary, liquid: '#339af0', start: 7.6, len: 9.0 },
    { c: 0.62, name: 'medium', color: P.secondary, liquid: '#74c0fc', start: 24.5, len: 3.3 },
    { c: 0.34, name: 'lower', color: P.tertiary, liquid: '#c5e4fb', start: 28.2, len: 3.3 },
  ];
  const V = (r, x) => r.c * VMAX * (1 - Math.exp(-x / TAU));
  const RATE0 = (r) => (r.c * VMAX) / TAU; // gradient at t = 0

  // ---------------------------------------------------------------- apparatus layout (page units)
  const FX = -0.36, FY = 0.2;          // flask centre on the page
  const FH = 0.19, FR = 0.075, NECK = 0.022;
  const LEVEL = 0.42;                  // liquid fraction of flask height
  const SX = -0.06;                    // syringe centre (lies along +X at y = FY)

  const flask = new kit.ConicalFlask({ radius: FR, neck: NECK, height: FH, level: LEVEL, liquidColor: RUNS[0].liquid, liquidOpacity: 0.55 });
  flask.position.set(FX, FY, 0);
  group.add(flask);
  const bubbles = new kit.Bubbles({ radius: 0.052, height: FH * LEVEL - 0.006, count: 46, size: 0.0035, speed: 0.07, seed: 11 });
  bubbles.position.z = 0.004;
  flask.add(bubbles);

  // rubber bung (axis along +Z)
  const bungMat = new THREE.MeshStandardMaterial({ color: '#8a4b32', roughness: 0.8 });
  const bung = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.021, 0.03, 24), bungMat);
  bung.rotation.x = Math.PI / 2;
  bung.position.set(0, 0, FH + 0.002);
  flask.add(bung);

  // small tube of MnO2 hung inside the flask by a thread; tipped over to start the reaction
  const PIVOT_Z = 0.128;
  const hang = new THREE.Group();
  hang.position.set(0, 0, PIVOT_Z);
  flask.add(hang);
  const vial = new kit.TestTube({ radius: 0.011, height: 0.046, level: 0, rim: true });
  vial.position.z = -0.022; // centred on the pivot
  hang.add(vial);
  const powderMat = new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.9 });
  const vialPowder = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0085, 0.016, 16), powderMat);
  vialPowder.rotation.x = Math.PI / 2;
  vialPowder.position.z = -0.022 + 0.0095;
  hang.add(vialPowder);
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, FH - PIVOT_Z - 0.022 + 0.004, 6), new THREE.MeshStandardMaterial({ color: '#495057' }));
  thread.rotation.x = Math.PI / 2;
  thread.position.z = PIVOT_Z + 0.022 + (FH - PIVOT_Z - 0.022) / 2 - 0.002;
  flask.add(thread);
  const TIP = 2.3; // rad, about Y
  // falling powder grains (flask-local frame); pure function of t
  const rnd = kit.rng(5);
  const grainGeom = new THREE.SphereGeometry(1, 8, 6);
  const grains = Array.from({ length: 22 }, () => {
    const m = new THREE.Mesh(grainGeom, powderMat);
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 0.045;
    m.userData = { tx: Math.cos(a) * d, ty: Math.sin(a) * d, delay: rnd() * 0.45, s: 0.0028 + rnd() * 0.0018, dx: (rnd() - 0.5) * 0.008 };
    m.scale.setScalar(m.userData.s);
    flask.add(m);
    return m;
  });
  const mouth = { x: Math.sin(TIP) * 0.022, z: PIVOT_Z + Math.cos(TIP) * 0.022 };

  // gas syringe
  const syringe = new kit.GasSyringe({ length: 0.34, radius: 0.028, maxVolume: 100, majorTick: 20, labels: false });
  syringe.position.set(SX, FY, 0);
  group.add(syringe);

  // delivery tube: bung -> up and over -> syringe nozzle
  const pathPts = [
    [FX, FY, FH + 0.012], [FX, FY, 0.25], [FX + 0.012, FY, 0.272], [FX + 0.045, FY, 0.283], [FX + 0.085, FY, 0.262],
    [FX + 0.105, FY, 0.19], [FX + 0.112, FY, 0.09], [FX + 0.118, FY, 0.045], [FX + 0.128, FY, 0.031], [SX - 0.172, FY, 0.03],
  ].map((p) => new THREE.Vector3(...p));
  const path = new THREE.CatmullRomCurve3(pathPts, false, 'centripetal');
  const tubeMat = new THREE.MeshStandardMaterial({ color: P.glass, roughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false });
  const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 80, 0.0055, 10, false), tubeMat);
  tube.renderOrder = 2;
  group.add(tube);
  const NP = 120;
  const pathSamples = Array.from({ length: NP + 1 }, (_, k) => path.getPointAt(k / NP));
  const gasBubbles = Array.from({ length: 12 }, () => {
    const m = new THREE.Mesh(grainGeom, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, transparent: true, opacity: 0.9 }));
    m.scale.setScalar(0.0034);
    group.add(m);
    return m;
  });

  // ---------------------------------------------------------------- stopwatch (tilted dial)
  const TILT = 0.75; // panels lean back so they read from the front AND the top
  const watch = new THREE.Group();
  watch.position.set(-0.415, 0.0, 0.055);
  watch.rotation.x = TILT;
  group.add(watch);
  const dialR = 0.05;
  watch.add(new THREE.Mesh(new THREE.CircleGeometry(dialR, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, side: THREE.DoubleSide })));
  const rim = new kit.Ribbon(Array.from({ length: 48 }, (_, k) => [Math.cos((k / 48) * Math.PI * 2) * dialR, Math.sin((k / 48) * Math.PI * 2) * dialR]), { width: 0.005, color: P.ink, closed: true, z: 0.001 });
  watch.add(rim);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    watch.add(new kit.Ribbon([[Math.cos(a) * dialR * 0.78, Math.sin(a) * dialR * 0.78], [Math.cos(a) * dialR * 0.92, Math.sin(a) * dialR * 0.92]], { width: 0.0025, color: P.inkSoft, z: 0.001 }));
  }
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 12), new THREE.MeshStandardMaterial({ color: '#868e96' }));
  knob.position.set(0, dialR + 0.006, 0);
  watch.add(knob);
  const hand = new kit.Ribbon([[0, -0.006], [0, dialR * 0.8]], { width: 0.004, color: P.danger, z: 0.002 });
  watch.add(hand);
  const t0Label = new kit.Label('t = 0 s', { size: 0.034, color: '#ffffff', background: P.danger, bgOpacity: 1, weight: 700 });
  t0Label.position.set(0, -dialR - 0.03, 0.002);
  watch.add(t0Label);

  // ---------------------------------------------------------------- graph panel (tilted)
  const graph = new kit.Graph2D({
    width: 0.5, height: 0.33, fontSize: 0.026, grid: false, backgroundOpacity: 1,
    title: 'Volume of O_2 against time',
    x: { min: 0, max: 1.05, label: 'Time / s', showTicks: false },
    y: { min: 0, max: 1.05, label: 'Volume of O_2 / cm^3', showTicks: false },
  });
  graph.position.set(0.235, 0.445, 0.13);
  graph.rotation.x = TILT;
  group.add(graph);
  const runViz = RUNS.map((r) => {
    const curve = graph.plot((x) => V(r, x), { color: r.color, width: 0.007, domain: [0, 1], samples: 160 });
    const slope = RATE0(r);
    const xEnd = Math.min(0.42, 1.0 / slope);
    const tan = graph.line([0, 0], [xEnd, slope * xEnd], { color: P.danger, width: 0.0055 });
    const tag = graph.label(`${r.name} [H_2O_2]`, 0.84, V(r, 1) + 0.075, { size: 0.022, color: r.color, background: '#ffffff', bgOpacity: 1 });
    return { r, curve, tan, tag };
  });
  const pen = graph.point(0, 0, { color: P.ink, radius: 0.008 });
  // Ribbon.setProgress is by arc length: convert a data x to the arc-length fraction so the pen
  // tip and the drawn curve stay together.
  const progressAtX = (rib, x) => {
    const pr = graph.plotRect;
    const lx = pr.x0 + (x / graph.xAxis.max) * (pr.x1 - pr.x0);
    const pts = rib.points;
    if (!pts.length || lx <= pts[0][0]) return 0;
    let lo = 0, hi = pts.length - 1;
    if (lx >= pts[hi][0]) return 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid][0] < lx) lo = mid; else hi = mid; }
    const f = (lx - pts[lo][0]) / (pts[hi][0] - pts[lo][0] || 1);
    return (rib.lengths[lo] + f * (rib.lengths[hi] - rib.lengths[lo])) / rib.totalLength;
  };
  // slope triangle on the first tangent
  const s1 = RATE0(RUNS[0]);
  const TA = 0.04, TB = 0.2;
  const triH = graph.line([TA, s1 * TA], [TB, s1 * TA], { color: P.ink, width: 0.004, dashed: true });
  const triV = graph.line([TB, s1 * TA], [TB, s1 * TB], { color: P.ink, width: 0.004, dashed: true });
  const dtL = graph.label('Δt', (TA + TB) / 2 + 0.02, s1 * TA - 0.075, { size: 0.024, halo: true });
  const dVL = graph.label('ΔV', TB + 0.065, (s1 * TA + s1 * TB) / 2, { size: 0.024, halo: true });
  const rateL = graph.label('initial rate =\nslope of tangent\nat t = 0', 0.7, 0.4, { size: 0.026, color: P.danger, background: '#ffffff', bgOpacity: 1, lineHeight: 1.2 });
  const t0Mark = graph.label('t = 0', 0.0, 0.0, { size: 0.022, color: P.danger, background: '#ffffff', bgOpacity: 1 });
  t0Mark.position.copy(graph.toLocal(0.0, 0.0, 0.006)).add(new THREE.Vector3(0.0, -0.022, 0));

  // ---------------------------------------------------------------- labels (billboards read from any view)
  const bb = (text, x, y, z, opts = {}) => {
    const l = new kit.Label(text, { size: 0.03, billboard: true, background: '#ffffff', bgOpacity: 0.95, ...opts });
    l.position.set(x, y, z);
    group.add(l);
    return l;
  };
  // equation floats over the blank top margin, left of the graph (clear of the apparatus in both views)
  const eqLabel = bb(kit.chem('                         MnO2(s)\n2H2O2(aq) -> 2H2O(l) + O2(g)'), -0.475, 0.585, 0.07, { size: 0.03, align: 'left', lineHeight: 1.15 });
  const h2o2Label = bb(kit.chem('H2O2(aq)'), FX, FY - 0.09, 0.03, { size: 0.028, color: P.primary });
  const concLabel = bb('', FX, FY - 0.09, 0.03, { size: 0.026, color: P.primary });
  const mnLabel = bb(kit.chem('MnO2(s)'), FX - 0.13, FY - 0.02, 0.15, { size: 0.026, color: '#343a40' });
  const syrLabel = bb('gas syringe', SX + 0.03, FY - 0.07, 0.085, { size: 0.026 });
  const o2Label = bb(kit.chem('O2(g)'), SX - 0.07, FY - 0.04, 0.075, { size: 0.026, color: P.tertiary });
  const sameLabel = bb(kit.chem('Kept the same:\ntemperature, mass of MnO2(s)'), -0.255, 0.585, 0.07, { size: 0.028, color: P.danger, lineHeight: 1.15 });
  // pointer from the MnO2 label to the hanging tube
  const mnArrow = new kit.Arrow({ from: [FX - 0.1, FY - 0.01, 0.14], to: [FX - 0.02, FY, 0.13], color: '#495057', radius: 0.0025, headLength: 0.014, headRadius: 0.007 });
  group.add(mnArrow);

  // ---------------------------------------------------------------- per-frame helpers
  const runIndexAt = (lt) => (lt < S[4] ? 0 : lt < RUNS[2].start - 0.2 ? 1 : 2);
  const xOf = (r, lt) => kit.clamp((lt - r.start) / r.len);

  return {
    group,
    update(t) {
      const lt = kit.loop(t, T);
      const s = captions(t);
      const i = s.index;
      const fade = Math.min(kit.invLerp(0, 0.4, lt), 1 - kit.invLerp(T - 0.4, T, lt));

      // ---- which run is live
      const ri = runIndexAt(lt);
      const run = RUNS[ri];
      const x = lt < run.start ? 0 : xOf(run, lt);
      const started = lt >= RUNS[0].start;
      const live = started && x > 0 && x < 1 && !(i === 3);
      const rateNow = started ? run.c * Math.exp(-x / TAU) : 0; // relative to run 1 at t = 0

      // ---- MnO2 tipping (once, in step 1) and falling grains
      const tip = kit.tween(lt, 5.8, 0.8, kit.ease.inOutCubic);
      hang.rotation.y = TIP * tip;
      vialPowder.visible = tip < 0.85;
      for (const g of grains) {
        const u = g.userData;
        const f = kit.clamp((lt - 6.55 - u.delay) / 0.75);
        g.visible = lt > 6.55 + u.delay;
        const e = f * f; // accelerate (gravity), damped in the liquid
        g.position.set(kit.lerp(mouth.x + u.dx, u.tx, f), kit.lerp(0, u.ty, f), kit.lerp(mouth.z, 0.006 + u.s, e));
      }

      // ---- liquid colour per run (darker = more concentrated), syringe, bubbles
      flask.setLiquidColor(run.liquid);
      let vol = started ? V(run, x) : 0;
      if (ri > 0 && lt < run.start) vol = V(RUNS[ri - 1], 1) * (1 - kit.invLerp(run.start - 0.5, run.start - 0.1, lt)); // syringe emptied
      syringe.setFraction(vol);
      bubbles.setIntensity(live ? Math.min(1, rateNow * 1.1) : 0).update(t);
      const nGas = live ? Math.round(gasBubbles.length * Math.min(1, rateNow)) : 0;
      gasBubbles.forEach((b, k) => {
        const u = kit.loop(t * 0.55 + k / gasBubbles.length, 1);
        b.visible = k < nGas;
        if (b.visible) b.position.copy(pathSamples[Math.round(u * NP)]);
      });

      // ---- stopwatch: starts at t = 0 when MnO2 is added
      kit.setOpacity(watch, fade * kit.invLerp(4.6, 5.2, lt));
      const elapsed = started ? x : 0;
      hand.rotation.z = -elapsed * Math.PI * 2 * 0.98;
      kit.setOpacity(t0Label, fade * (started ? kit.envelope(lt, RUNS[0].start, S[2] + 2.5, 0.25) : 0));
      t0Label.scale.setScalar(0.8 + 0.2 * kit.ease.outBack(kit.clamp((lt - RUNS[0].start) / 0.4)));

      // ---- graph
      kit.setOpacity(graph, fade);
      runViz.forEach((v, k) => {
        const r = v.r;
        const xr = lt < r.start ? 0 : xOf(r, lt);
        const shown = k === 0 ? started : lt >= r.start;
        v.curve.setProgress(progressAtX(v.curve, xr));
        // dim curve 1 while its tangent is analysed (step 3)
        kit.setOpacity(v.curve, fade * (shown ? (k === 0 && i === 3 ? kit.lerp(1, 0.3, kit.invLerp(S[3] + 0.2, S[3] + 1.0, lt)) : 1) : 0));
        const tanStart = k === 0 ? S[3] + 0.6 : r.start + r.len - 0.6;
        v.tan.setProgress(kit.tween(lt, tanStart, 0.8));
        kit.setOpacity(v.tan, fade * (lt > tanStart ? 1 : 0));
        const tagAt = k === 0 ? S[4] + 0.2 : r.start + 0.4;
        kit.setOpacity(v.tag, fade * (i === 4 ? kit.invLerp(tagAt, tagAt + 0.5, lt) : 0));
      });
      pen.setData(x, started ? V(run, x) : 0);
      kit.setOpacity(pen, fade * (started && i !== 3 ? 1 : 0));
      const triA = i === 3 ? kit.invLerp(S[3] + 1.6, S[3] + 2.2, lt) : 0;
      for (const o of [triH, triV, dtL, dVL]) kit.setOpacity(o, fade * triA);
      kit.setOpacity(rateL, fade * (i === 3 ? kit.invLerp(S[3] + 2.6, S[3] + 3.2, lt) : 0));
      kit.setOpacity(t0Mark, fade * (i === 3 ? kit.invLerp(S[3] + 0.3, S[3] + 0.8, lt) : 0));

      // ---- labels
      kit.setOpacity(eqLabel, fade * (lt >= 5.1 ? kit.invLerp(5.1, 5.6, lt) * (1 - kit.invLerp(S[4] + 0.3, S[4] + 0.8, lt)) : 0));
      kit.setOpacity(h2o2Label, fade * (i < 4 ? 1 : 0));
      concLabel.setText(kit.chem(`${run.name} [H2O2]`));
      kit.setOpacity(concLabel, fade * (i === 4 ? kit.invLerp(S[4], S[4] + 0.4, lt) : 0));
      kit.setOpacity(mnLabel, fade * (lt < 7.4 ? 1 : 1 - kit.invLerp(7.4, 7.9, lt)));
      kit.setOpacity(mnArrow, fade * (lt < 7.4 ? 1 : 0));
      kit.setOpacity(syrLabel, fade * (i === 0 ? 1 : 0));
      kit.setOpacity(o2Label, fade * (i === 2 ? kit.invLerp(S[2] + 0.5, S[2] + 1, lt) : 0));
      kit.setOpacity(sameLabel, fade * (i === 4 ? kit.invLerp(S[4] + 0.8, S[4] + 1.3, lt) : 0));
    },
    dispose() {
      kit.disposeObject(group);
    },
  };
}
