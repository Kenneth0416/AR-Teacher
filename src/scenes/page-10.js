// Page 10 - Algebraic method, k, and the order summary table.
//
// Rate changes by (concentration factor)^order. A stage floats over the middle of the page, just
// above the printed summary table: three lanes (zeroth / first / second order) each with blue [A]
// cubes and orange rate cubes. When [A] is doubled the rate becomes 2^0 = 1, 2^1 = 2, 2^2 = 4 cubes
// (the second-order rate grows as a 2 x 2 square); when tripled, 1, 3 and 9 (a 3 x 3 square).
// The link to the algebra (2 = 2^m, m = 1) and the printed table columns/rows are highlighted.
// Finally the stage clears and the printed k calculation is annotated: mol dm^-3 cancels, so
// k = 3.2 x 10^-3 s^-1 (unit s^-1 for a first-order reaction).
// Contract: docs/SCENE_CONTRACT.md
export default function createScene(ctx) {
  const { THREE, kit, page } = ctx;
  const P = kit.palette;
  const group = new THREE.Group();

  const STEPS = [
    { duration: 4, caption: 'Start: [A] = 1 unit, rate = 1 unit for every order' },
    { duration: 3, caption: 'Link: dividing (2) by (1) gives 2 = 2^m, so m = 1 (first order)' },
    { duration: 7, caption: 'Concentration doubled: rate ×1, ×2, ×4 (2^0, 2^1, 2^2)' },
    { duration: 4, caption: 'Back to the start: [A] = 1 unit' },
    { duration: 7, caption: 'Concentration tripled: rate ×1, ×3, ×9 (3^0, 3^1, 3^2)' },
    { duration: 4, caption: 'Summary: rate changes by (concentration factor)^n, where n = order' },
    { duration: 5, caption: 'k = 3.2 × 10^-3 s^-1 for this first-order reaction: don’t forget the unit!' },
  ];
  const T = kit.totalDuration(STEPS); // 34 s
  const captions = kit.captionTrack(ctx, STEPS);

  // ---------------------------------------------------------------- stage layout ------------
  const STAGE = { x: 0, y: -0.132, w: 0.88, h: 0.33 };
  const HEAD_Y = 0.004;
  const LANE_Y = [-0.052, -0.117, -0.182];
  const CUBE = 0.034, PITCH = 0.04;
  const CONC_X = -0.17, RATE_X = 0.02, FACT_X = 0.14, LABEL_X = -0.425;
  const ORDERS = [
    { name: 'Zeroth order', law: 'rate = k', p: 0 },
    { name: 'First order', law: 'rate = k[A]', p: 1 },
    { name: 'Second order', law: 'rate = k[A]^2', p: 2 },
  ];
  const WORDS = {
    2: ['Does not change', 'Double (×2)', 'Quadruples (×4)'],
    3: ['Does not change', 'Triples (×3)', 'Nonuples (×9)'],
  };

  const stagePanel = new kit.Panel({ width: STAGE.w, height: STAGE.h, opacity: 0.97, border: P.panelEdge, radius: 0.018 });
  stagePanel.position.set(STAGE.x, STAGE.y, 0.003);
  group.add(stagePanel);
  const stage = new THREE.Group(); // lane content (cubes, labels) - fades out for the summary
  group.add(stage);
  const lanesFixed = new THREE.Group(); // lane names stay for the summary grid
  group.add(lanesFixed);

  const lbl = (parent, text, x, y, opts = {}) => {
    const l = new kit.Label(text, { size: 0.025, color: P.ink, weight: 700, halo: false, ...opts });
    l.position.set(x, y, opts.z ?? 0.008);
    parent.add(l);
    return l;
  };

  // lane highlight (used to link the algebra to the first-order lane). HighlightRect's fill does not
  // write depth, so it cannot hide the stage panel underneath it.
  const laneStrip = new kit.HighlightRect({ x: 0, y: LANE_Y[1], width: STAGE.w - 0.04, height: 0.056 }, { color: P.accent, fillOpacity: 0.3, lineWidth: 0.005, z: 0.0045, pulse: false });
  group.add(laneStrip);

  ORDERS.forEach((o, i) => {
    lbl(lanesFixed, o.name, LABEL_X, LANE_Y[i] + 0.015, { align: 'left', weight: 800 });
    lbl(lanesFixed, o.law, LABEL_X, LANE_Y[i] - 0.016, { align: 'left', color: P.primary, weight: 700 });
  });

  // header
  const hConc = lbl(stage, '[A] ×1', CONC_X + PITCH, HEAD_Y, { size: 0.027, weight: 800, color: '#1864ab' });
  lbl(stage, 'rate', RATE_X + PITCH, HEAD_Y, { size: 0.027, weight: 800, color: '#c2410c' });
  lbl(stage, 'change in rate', FACT_X, HEAD_Y, { size: 0.024, weight: 700, color: P.inkSoft, align: 'left' });

  // cubes: each has a list of [tIn, tOut] windows (drops in at tIn, lifts away at tOut)
  const cubeGeo = new THREE.BoxGeometry(CUBE, CUBE, CUBE);
  cubeGeo.translate(0, 0, CUBE / 2);
  const concMat = new THREE.MeshStandardMaterial({ color: P.primary, roughness: 0.45 });
  const rateMat = new THREE.MeshStandardMaterial({ color: P.secondary, roughness: 0.45 });
  const cubes = [];
  const addCube = (mat, x, y, windows) => {
    const m = new THREE.Mesh(cubeGeo, mat);
    m.position.set(x, y, 0.004);
    m.visible = false;
    stage.add(m);
    cubes.push({ m, x, y, windows });
  };
  const T_RESET = 14.3, T_SUMMARY = 25.0;
  // concentration cubes (all lanes identical)
  ORDERS.forEach((o, li) => {
    const y = LANE_Y[li];
    addCube(concMat, CONC_X, y, [[0.15 + li * 0.12, T_SUMMARY]]);
    addCube(concMat, CONC_X + PITCH, y, [[7.4 + li * 0.08, T_RESET], [18.4 + li * 0.08, T_SUMMARY]]);
    addCube(concMat, CONC_X + 2 * PITCH, y, [[18.65 + li * 0.08, T_SUMMARY]]);
  });
  // rate cubes
  const LANE_T2 = [8.6, 9.2, 10.0]; // when each lane's rate responds to x2
  const LANE_T3 = [19.4, 20.0, 20.8]; // ... to x3
  ORDERS.forEach((o, li) => {
    const y0 = LANE_Y[li];
    // grid positions (r, c) used by this order for n = 3: n^p cubes
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const x = RATE_X + c * PITCH, y = y0 - r * PITCH;
      const need2 = o.p === 0 ? r === 0 && c === 0 : o.p === 1 ? r === 0 && c < 2 : r < 2 && c < 2;
      const need3 = o.p === 0 ? r === 0 && c === 0 : o.p === 1 ? r === 0 : true;
      const base = r === 0 && c === 0;
      if (!need3) continue;
      const k = r * 3 + c; // stagger
      const w = [];
      if (base) w.push([0.3 + li * 0.12, T_SUMMARY]);
      else {
        if (need2) w.push([LANE_T2[li] + k * 0.12, T_RESET]);
        w.push([LANE_T3[li] + k * 0.1, T_SUMMARY]);
      }
      addCube(rateMat, x, y, w);
    }
  });

  // arrows conc -> rate
  ORDERS.forEach((o, li) => {
    const a = new kit.Arrow({ from: [CONC_X + 2 * PITCH + 0.022, LANE_Y[li], 0.02], to: [RATE_X - 0.024, LANE_Y[li], 0.02], color: P.inkSoft, radius: 0.0035, headLength: 0.016, headRadius: 0.009 });
    stage.add(a);
  });

  // factor labels per lane (2 lines)
  const fact = ORDERS.map((o, li) => ({
    top: lbl(stage, '×1', FACT_X, LANE_Y[li] + 0.014, { size: 0.029, weight: 800, align: 'left', color: '#c2410c' }),
    word: lbl(stage, '', FACT_X, LANE_Y[li] - 0.018, { size: 0.022, weight: 700, align: 'left', color: P.ink }),
  }));
  const factorText = (n, p) => (n === 1 ? '×1' : `×${n ** p} = ${n}^${p}`);

  // summary grid (step 6)
  const grid = new THREE.Group();
  group.add(grid);
  const GX = [-0.07, 0.24];
  lbl(grid, '[A] doubled (×2)', GX[0], HEAD_Y, { size: 0.027, weight: 800, color: '#1864ab' });
  lbl(grid, '[A] tripled (×3)', GX[1], HEAD_Y, { size: 0.027, weight: 800, color: '#1864ab' });
  ORDERS.forEach((o, li) => {
    [2, 3].forEach((n, ci) => {
      lbl(grid, `rate ×${n ** o.p}  (${n}^${o.p})`, GX[ci], LANE_Y[li], { size: 0.028, weight: 800, color: '#c2410c' });
    });
  });
  lbl(grid, 'rate changes by (concentration factor)^n, n = order', 0.0, -0.262, { size: 0.026, weight: 800, color: P.ink, background: '#fff3bf', halo: false, z: 0.009 });

  // ---------------------------------------------------------------- printed-page links ------
  const hl = (bbox, color = P.accent, fill = 0.2) => {
    const h = new kit.HighlightRect(page.bboxToRect(bbox), { color, fillOpacity: fill, lineWidth: 0.004, padding: 0.004, radius: 0.008, pulse: false });
    group.add(h);
    return h;
  };
  // algebra: "2 = (2)^m  ... m = 1"
  const hlAlg = hl([0.37, 0.305, 0.52, 0.352]);
  const algTag = lbl(group, 'm = 1: first order with respect to X', 0.04, 0.21, {
    size: 0.026, align: 'left', background: P.panel, border: P.accent, weight: 800, z: 0.012,
  });
  const algArrow = new kit.Arrow({ from: [-0.13, 0.19, 0.03], to: [-0.27, LANE_Y[1] + 0.03, 0.03], color: P.accent, radius: 0.004, headLength: 0.022, headRadius: 0.011 });
  group.add(algArrow);
  // summary table: doubled column, tripled column, and rows
  const hlCol2 = hl([0.418, 0.79, 0.65, 0.931]);
  const hlCol3 = hl([0.65, 0.79, 0.878, 0.931]);
  const hlRows = [[0.848, 0.875], [0.876, 0.903], [0.904, 0.931]].map(([v0, v1]) => hl([0.23, v0, 0.878, v1], P.primary, 0.16));
  // k calculation: highlight, cancel mol dm^-3 (numerator + denominator), ring the s^-1 of the answer
  const hlK = hl([0.22, 0.6, 0.6, 0.72], P.danger, 0.05);
  const strike = (u0, u1, v) => {
    const a = page.uvToXY(u0, v), b = page.uvToXY(u1, v);
    const r = new kit.Ribbon([[a.x, a.y - 0.006], [b.x, b.y + 0.006]], { width: 0.005, color: P.danger, z: 0.012 });
    group.add(r);
    return r;
  };
  const strikes = [strike(0.4, 0.48, 0.652), strike(0.392, 0.468, 0.669)];
  const ringPos = page.uvToXY(0.413, 0.704);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.019, 0.024, 40), new THREE.MeshBasicMaterial({ color: P.danger, transparent: true, depthWrite: false, toneMapped: false }));
  ring.position.set(ringPos.x, ringPos.y, 0.012);
  ring.renderOrder = 21;
  group.add(ring);
  const kCall = new kit.Label('k = 3.2 × 10^-3 s^-1', { size: 0.03, background: P.panel, border: P.danger, color: P.ink, weight: 800, align: 'left', bgOpacity: 0.97 });
  kCall.position.set(0.215, -0.205, 0.016);
  group.add(kCall);
  const kNote = new kit.Label('mol dm^-3 cancels → unit s^-1 (first order)', { size: 0.024, background: P.panel, color: P.danger, weight: 800, align: 'left', bgOpacity: 0.95 });
  kNote.position.set(-0.02, -0.268, 0.016);
  group.add(kNote);

  // ---------------------------------------------------------------- update ------------------
  const env = kit.envelope;
  const presence = (windows, lt) => {
    for (const [a, b] of windows) {
      if (lt < a || lt > b + 0.5) continue;
      const i = kit.ease.outCubic(kit.clamp((lt - a) / 0.45));
      const o = kit.ease.inCubic(kit.clamp((lt - b) / 0.45));
      return { i, o };
    }
    return null;
  };
  const nAt = (lt) => (lt >= 18.3 && lt < T_SUMMARY ? 3 : lt >= 7.3 && lt < 14.5 ? 2 : 1);

  function update(t) {
    const lt = kit.loop(t, T);
    captions(t);

    // stage visibility: lanes 0..25, summary grid 25..29, all cleared for the k annotations
    const stageA = kit.invLerp(0, 0.4, lt) * (1 - kit.invLerp(29.0, 29.5, lt));
    kit.setOpacity(stagePanel, stageA);
    kit.setOpacity(lanesFixed, stageA);
    kit.setOpacity(stage, kit.invLerp(0, 0.4, lt) * (1 - kit.invLerp(T_SUMMARY, T_SUMMARY + 0.5, lt)));
    kit.setOpacity(grid, env(lt, T_SUMMARY + 0.3, 29.3, 0.5));

    // cubes (scale + drop; materials shared, so no per-cube opacity)
    for (const c of cubes) {
      const pr = presence(c.windows, lt);
      if (!pr) { c.m.visible = false; continue; }
      const s = Math.min(1, pr.i * 3) * (1 - pr.o);
      c.m.visible = s > 0.01;
      c.m.scale.setScalar(Math.max(1e-3, s));
      c.m.position.z = 0.004 + 0.13 * (1 - pr.i) + 0.08 * pr.o;
    }

    // header + factor labels
    const n = nAt(lt);
    hConc.setText(`[A] ×${n}`);
    ORDERS.forEach((o, li) => {
      let ln = 1;
      if (lt >= LANE_T2[li] && lt < 14.5) ln = 2;
      if (lt >= LANE_T3[li] && lt < T_SUMMARY) ln = 3;
      fact[li].top.setText(factorText(ln, o.p));
      fact[li].word.setText(ln === 1 ? '' : WORDS[ln][li]);
    });

    // algebra link (step 2)
    const algA = env(lt, 4.0, 7.2, 0.4);
    kit.setOpacity(hlAlg, algA);
    kit.setOpacity(algTag, algA);
    algArrow.setProgress(kit.tween(lt, 4.4, 0.8) * (1 - kit.invLerp(6.8, 7.2, lt)));
    kit.setOpacity(laneStrip, env(lt, 4.6, 7.4, 0.4) * (0.75 + 0.25 * Math.sin(lt * 6)));

    // printed summary table
    kit.setOpacity(hlCol2, env(lt, 10.6, 14.3, 0.4));
    kit.setOpacity(hlCol3, env(lt, 21.4, T_SUMMARY, 0.4));
    hlRows.forEach((h, i) => kit.setOpacity(h, env(lt, 25.6 + i * 0.6, 29.2, 0.3)));

    // k annotations on the printed calculation
    const kA = env(lt, 29.5, 33.6, 0.4);
    kit.setOpacity(hlK, kA);
    strikes.forEach((s, i) => { s.setProgress(kit.tween(lt, 30.1 + i * 0.4, 0.4)); kit.setOpacity(s, kA); });
    const ringOn = lt > 31.0 && lt < 33.6;
    ring.visible = ringOn;
    if (ringOn) {
      const ph = 0.5 + 0.5 * Math.sin((lt - 31.0) * 6);
      ring.scale.setScalar(1 + 0.25 * ph);
      ring.material.opacity = (0.55 + 0.45 * ph) * kA;
    }
    kit.setOpacity(kCall, env(lt, 30.9, 33.6, 0.4));
    kit.setOpacity(kNote, env(lt, 31.4, 33.6, 0.4));
  }

  update(0);
  return {
    group,
    update,
    dispose() {
      kit.disposeObject(group);
    },
  };
}
