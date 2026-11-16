// Page 9 - Numerical method: compare two experiments in which only ONE concentration changes.
//
// A 3D "data bench" sits in the empty space at the foot of the page: one row per experiment with
// [X] and [Y] blocks and a raised bar whose length is the initial rate. Experiments 1 and 2 are
// pulled together ([Y] same, [X] x2): two ghost copies of bar 1 exactly fill bar 2 -> rate x2 ->
// 2 = 2^a, a = 1 (badge next to the printed conclusion). Then experiments 1 and 3 ([X] same,
// [Y] x2): bar 1 exactly matches bar 3 -> rate unchanged -> 1 = 2^b, b = 0. Ends on rate = k[X].
// The matching printed table rows are highlighted throughout.
// Contract: docs/SCENE_CONTRACT.md
export default function createScene(ctx) {
  const { THREE, kit, page } = ctx;
  const P = kit.palette;
  const group = new THREE.Group();

  // ---------------------------------------------------------------- data (from the page) ----
  // [X], [Y] in mol dm^-3; initial rate in 10^-4 mol dm^-3 s^-1
  const EXPTS = [
    { n: 1, X: 0.02, Y: 0.02, rate: 0.64 },
    { n: 2, X: 0.04, Y: 0.02, rate: 1.28 },
    { n: 3, X: 0.02, Y: 0.04, rate: 0.64 },
  ];

  const STEPS = [
    { duration: 4, caption: 'Three experiments for X + Y → products at 298 K' },
    { duration: 6, caption: 'Experiments 1 and 2: [Y] fixed, [X] doubled' },
    { duration: 5, caption: 'Rate doubles when [X] doubles' },
    { duration: 3, caption: '2 = 2^a, so the order of reaction with respect to X is 1' },
    { duration: 5, caption: 'Experiments 1 and 3: [X] fixed, [Y] doubled' },
    { duration: 5, caption: 'Rate unchanged: 1 = 2^b, so the order with respect to Y is 0' },
    { duration: 4, caption: 'Rate equation: rate = k[X]   ([Y]^0 = 1)' },
  ];
  const T = kit.totalDuration(STEPS); // 32 s
  const captions = kit.captionTrack(ctx, STEPS);

  // ---------------------------------------------------------------- layout ------------------
  const SLOT = [-0.385, -0.457, -0.529];
  const COL = { num: -0.43, X: -0.305, Y: -0.105, bar: 0.05 };
  const CONN = { X: -0.236, Y: -0.034, R: 0.452 };
  const BAR_PER = 0.3 / 1.28; // page units per 10^-4 mol dm^-3 s^-1
  const CHIP_W = 0.105, CHIP_H = 0.056, CHIP_D = 0.014;
  const BAR_H = 0.044, BAR_D = 0.03;

  // backing for the bench
  const bench = new kit.Panel({ width: 0.96, height: 0.29, opacity: 0.93, border: P.panelEdge, radius: 0.018 });
  bench.position.set(0, -0.4225, 0.002);
  group.add(bench);

  // header
  const hdr = (text, x, y, size = 0.024, extra = {}) => {
    const l = new kit.Label(text, { size, color: P.ink, weight: 700, halo: false, ...extra });
    l.position.set(x, y, 0.006);
    group.add(l);
    return l;
  };
  hdr('Expt', COL.num, -0.31);
  hdr('[X]', COL.X, -0.31, 0.028);
  hdr('[Y]', COL.Y, -0.31, 0.028);
  hdr('(mol dm^-3)', (COL.X + COL.Y) / 2, -0.338, 0.021, { color: P.inkSoft, weight: 600 });
  hdr('Initial rate', COL.bar + 0.17, -0.31);
  hdr('(× 10^-4 mol dm^-3 s^-1)', COL.bar + 0.17, -0.338, 0.021, { color: P.inkSoft, weight: 600 });

  // shared geometry
  const chipGeo = new THREE.ExtrudeGeometry(kit.roundedRectShape(CHIP_W, CHIP_H, 0.012), { depth: CHIP_D, bevelEnabled: false, curveSegments: 6 });
  const barGeo = new THREE.BoxGeometry(1, BAR_H, BAR_D);
  barGeo.translate(0.5, 0, BAR_D / 2); // x from 0 to 1, stands on the page

  const NEUTRAL = new THREE.Color('#e9ecef');
  const SAME = new THREE.Color('#8ce99a');
  const CHANGED = new THREE.Color('#ffd43b');

  const rows = EXPTS.map((e, i) => {
    const row = new THREE.Group();
    row.position.set(0, SLOT[i], 0);
    group.add(row);
    const num = new kit.Label(String(e.n), { size: 0.032, background: P.ink, color: '#ffffff', weight: 800, padding: 0.45 });
    num.position.set(COL.num, 0, 0.006);
    row.add(num);
    const chip = (x, val) => {
      const mat = new THREE.MeshStandardMaterial({ color: NEUTRAL.clone(), roughness: 0.6 });
      const m = new THREE.Mesh(chipGeo, mat);
      m.position.set(x, 0, 0.003);
      row.add(m);
      const l = new kit.Label(val.toFixed(2), { size: 0.032, weight: 800, halo: false, color: P.ink });
      l.position.set(x, 0, CHIP_D + 0.004);
      row.add(l);
      return mat;
    };
    const xMat = chip(COL.X, e.X);
    const yMat = chip(COL.Y, e.Y);
    const bar = new THREE.Mesh(barGeo, new THREE.MeshStandardMaterial({ color: P.secondary, roughness: 0.5 })); // own material: rows dim separately
    bar.position.set(COL.bar, 0, 0.003);
    row.add(bar);
    const len = e.rate * BAR_PER;
    const val = new kit.Label(e.rate.toFixed(2), { size: 0.03, weight: 800, color: '#c2410c', align: 'left' });
    val.position.set(COL.bar + len + 0.012, 0, BAR_D + 0.006);
    row.add(val);
    return { e, row, xMat, yMat, bar, len, val };
  });

  // ghost copies of bar 1 (translucent, outlined)
  const ghostMat = new THREE.MeshStandardMaterial({ color: '#ff922b', transparent: true, opacity: 0.45, depthWrite: false, roughness: 0.4 });
  const edgeGeo = new THREE.EdgesGeometry(barGeo);
  const edgeMat = new THREE.LineBasicMaterial({ color: '#7c2d12' });
  const ghosts = [0, 1].map(() => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(barGeo, ghostMat);
    m.renderOrder = 3;
    const ed = new THREE.LineSegments(edgeGeo, edgeMat);
    g.add(m, ed);
    g.scale.set(rows[0].len, 1.02, 1.05);
    g.visible = false;
    group.add(g);
    return g;
  });

  // connectors between slot A and slot B: arrow + "x2" (changed) or "same" (unchanged)
  const yTop = SLOT[0] - 0.016, yBot = SLOT[1] + 0.016;
  const mkConn = (x, side = 1) => {
    const arrow = new kit.Arrow({ from: [x, yTop, 0.03], to: [x, yBot, 0.03], color: P.accent, radius: 0.0045, headLength: 0.022, headRadius: 0.011 });
    group.add(arrow);
    const align = side > 0 ? 'left' : 'right';
    const x2 = new kit.Label('×2', { size: 0.03, weight: 800, color: '#b35c00', align });
    x2.position.set(x + side * 0.012, (SLOT[0] + SLOT[1]) / 2, 0.03);
    group.add(x2);
    const same = new kit.Label('same', { size: 0.025, weight: 800, color: '#2b8a3e', align });
    same.position.set(x + side * 0.004, (SLOT[0] + SLOT[1]) / 2, 0.03);
    group.add(same);
    return { arrow, x2, same };
  };
  // the rate connector's labels sit to the LEFT of its arrow (page edge on the right)
  const conn = { X: mkConn(CONN.X), Y: mkConn(CONN.Y), R: mkConn(CONN.R, -1) };

  // printed table rows (1, 2, 3)
  const ROWV = [[0.228, 0.252], [0.252, 0.276], [0.276, 0.301]];
  const rowHL = ROWV.map(([v0, v1]) => {
    const h = new kit.HighlightRect(page.bboxToRect([0.14, v0, 0.84, v1]), { color: P.accent, fillOpacity: 0.2, lineWidth: 0.004, padding: 0.002, radius: 0.006, pulse: false });
    group.add(h);
    return h;
  });

  // results next to the printed conclusions, and the equation slot next to "Rate equation:"
  const badge = (text, x, y, color) => {
    const l = new kit.Label(text, { size: 0.034, background: P.panel, border: color, color: P.ink, weight: 800, align: 'left', bgOpacity: 0.96 });
    l.position.set(x, y, 0.014);
    group.add(l);
    return l;
  };
  const BX = { x: 0.17, y: -0.032 }, BY = { x: 0.18, y: -0.185 }, EQ = { x: 0.05, y: -0.245 };
  const badgeX = badge('2 = 2^a  ⇒  a = 1', BX.x, BX.y, P.tertiary);
  const badgeY = badge('1 = 2^b  ⇒  b = 0', BY.x, BY.y, P.tertiary);
  const eqGeneral = badge('rate = k[X]^a[Y]^b', EQ.x, EQ.y, P.primary);
  const eqSub = badge('rate = k[X]^1[Y]^0', EQ.x, EQ.y, P.primary);
  const eqFinal = new kit.Label('rate = k[X]', { size: 0.042, background: P.panel, border: P.danger, color: P.ink, weight: 800, align: 'left', bgOpacity: 0.97, padding: 0.4 });
  eqFinal.position.set(EQ.x, EQ.y, 0.016);
  group.add(eqFinal);

  // ---------------------------------------------------------------- update ------------------
  const env = kit.envelope;
  const tmpC = new THREE.Color();
  const colorTo = (mat, target, f) => { tmpC.copy(NEUTRAL).lerp(target, f); mat.color.copy(tmpC); };

  function update(t) {
    const lt = kit.loop(t, T);
    captions(t);

    // phases: A = expts 1 & 2 (4.0 .. 17.4), B = expts 1 & 3 (18.6 .. 28)
    const pA = env(lt, 4.2, 17.4, 0.6);
    const pB = env(lt, 18.6, 28.2, 0.6);

    // row positions: expt 3 and expt 2 swap slots for phase B (and swap back at the end)
    // (swapped while they are faded out; the swap back happens while the bench fades at the end)
    const swap = lt >= 17.8 && lt < 31.3 ? 1 : 0;
    const swapFade = 1 - env(lt, 17.4, 18.2, 0.4);
    rows[1].row.position.set(0, swap ? SLOT[2] : SLOT[1], 0);
    rows[2].row.position.set(0, swap ? SLOT[1] : SLOT[2], 0);

    // dimming of the experiment not being compared
    const dim3 = env(lt, 4.0, 17.4, 0.6);
    const dim2 = env(lt, 18.6, 40, 0.6);
    const benchA = kit.invLerp(0, 0.4, lt) * (1 - kit.invLerp(30.9, 31.3, lt));
    const grow = kit.tween(lt, 0.2, 1.4, kit.ease.outCubic);
    rows.forEach((r, i) => {
      const dim = i === 2 ? dim3 : i === 1 ? dim2 : 0;
      const sf = i === 0 ? 1 : swapFade;
      kit.setOpacity(r.row, (1 - 0.7 * dim) * benchA * sf);
      r.bar.scale.x = Math.max(1e-4, r.len * grow);
      kit.setOpacity(r.val, kit.invLerp(1.2, 1.6, lt) * (1 - 0.7 * dim) * benchA * sf);
    });

    // chip colours: changed = amber, same = green
    // (phases A and B never overlap, so one of pA / pB is always 0)
    const inA = pA > 0;
    colorTo(rows[0].xMat, inA ? CHANGED : SAME, inA ? pA : pB);
    colorTo(rows[0].yMat, inA ? SAME : CHANGED, inA ? pA : pB);
    colorTo(rows[1].xMat, CHANGED, pA); colorTo(rows[1].yMat, SAME, pA);
    colorTo(rows[2].xMat, SAME, pB); colorTo(rows[2].yMat, CHANGED, pB);

    // connectors
    const cA = env(lt, 5.2, 17.2, 0.4), cB = env(lt, 19.4, 28.2, 0.4);
    conn.X.arrow.setProgress(kit.tween(lt, 5.4, 0.8) * (1 - kit.invLerp(16.8, 17.2, lt)));
    kit.setOpacity(conn.X.x2, cA);
    kit.setOpacity(conn.X.same, cB);
    conn.Y.arrow.setProgress(kit.tween(lt, 19.6, 0.8) * (1 - kit.invLerp(27.8, 28.2, lt)));
    kit.setOpacity(conn.Y.x2, cB);
    kit.setOpacity(conn.Y.same, env(lt, 6.4, 17.2, 0.4));
    conn.R.arrow.setProgress(kit.tween(lt, 13.0, 0.7) * (1 - kit.invLerp(16.8, 17.2, lt)));
    kit.setOpacity(conn.R.x2, env(lt, 13.4, 17.2, 0.4));
    kit.setOpacity(conn.R.same, env(lt, 25.0, 28.2, 0.4));

    // ghost copies of bar 1
    // phase A: ghost 1 -> row B start, ghost 2 -> row B after ghost 1 (together = bar 2)
    // phase B: ghost 1 -> row B start (matches bar 3 exactly)
    const gA = env(lt, 10.0, 16.8, 0.3), gB = env(lt, 23.0, 27.8, 0.3);
    const L1 = rows[0].len;
    const place = (g, u, xTo, show) => {
      g.visible = show > 0.01;
      if (!g.visible) return;
      const e = kit.ease.inOutCubic(kit.clamp(u));
      const up = Math.sin(Math.PI * kit.clamp(u)) * 0.06;
      g.position.set(kit.lerp(COL.bar, xTo, e), kit.lerp(SLOT[0], SLOT[1], e), 0.004 + up + 0.006 * e);
      kit.setOpacity(g, show);
    };
    if (gA > 0) {
      place(ghosts[0], (lt - 10.3) / 1.2, COL.bar, gA);
      place(ghosts[1], (lt - 11.7) / 1.4, COL.bar + L1, lt > 11.5 ? gA : 0);
    } else if (gB > 0) {
      place(ghosts[0], (lt - 23.3) / 1.3, COL.bar, gB);
      ghosts[1].visible = false;
    } else { ghosts[0].visible = false; ghosts[1].visible = false; }

    // printed table highlights
    kit.setOpacity(rowHL[0], Math.max(pA, pB));
    kit.setOpacity(rowHL[1], pA);
    kit.setOpacity(rowHL[2], pB);

    // results and the rate equation
    const merge = kit.tween(lt, 28.2, 0.9);
    const bx = env(lt, 15.0, 29.1, 0.4);
    badgeX.position.set(kit.lerp(BX.x, EQ.x + 0.08, merge), kit.lerp(BX.y, EQ.y, merge), 0.014 + 0.04 * Math.sin(Math.PI * merge));
    kit.setOpacity(badgeX, bx);
    const by = env(lt, 25.0, 29.1, 0.4);
    badgeY.position.set(kit.lerp(BY.x, EQ.x + 0.08, merge), kit.lerp(BY.y, EQ.y, merge), 0.014 + 0.04 * Math.sin(Math.PI * merge));
    kit.setOpacity(badgeY, by);
    kit.setOpacity(eqGeneral, env(lt, 0.3, 28.6, 0.4));
    kit.setOpacity(eqSub, env(lt, 28.7, 30.0, 0.3));
    kit.setOpacity(eqFinal, env(lt, 29.9, 31.8, 0.3));
    eqFinal.scale.setScalar(1 + 0.12 * Math.exp(-(((lt - 30.2) / 0.3) ** 2)));
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
