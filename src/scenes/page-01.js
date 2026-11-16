// Page 1 - 13.2 Rate equation: the unit of k is derived, not memorised.
// A floating derivation panel sits above the printed units table (which stays visible). For
// rate = k[A]^n with rate in mol dm^-3 s^-1, the panel cancels units for n = 0, 1, 2 while the
// matching printed table row is highlighted; it ends on a summary with the printed unit cells lit.
// Contract: docs/SCENE_CONTRACT.md
export default function createScene(ctx) {
  const { THREE, kit, page } = ctx;
  const P = kit.palette;
  const PURPLE = P.quaternary, ORANGE = P.secondary, RED = P.danger, INK = P.ink;
  const group = new THREE.Group();

  const STEPS = [
    { duration: 4, caption: 'x, y come from experiments, not from the mole ratio a, b' },
    { duration: 4, caption: 'Let the unit of rate be mol dm^-3 s^-1' },
    { duration: 7, caption: 'Zeroth order: k = mol dm^-3 s^-1' },
    { duration: 7, caption: 'First order: k = s^-1' },
    { duration: 7, caption: 'Second order: k = mol^-1 dm^3 s^-1' },
    { duration: 4, caption: 'Unit of k depends on the overall order' },
  ];
  const captions = kit.captionTrack(ctx, STEPS);
  const T = kit.totalDuration(STEPS); // 33 s
  const START = []; { let s = 0; for (const st of STEPS) { START.push(s); s += st.duration; } }

  // ---------------------------------------------------------------- printed table highlights
  // Table geometry measured on the page image (1105 x 1430 px).
  const px = (x0, y0, x1, y1) => page.bboxToRect([x0 / 1105, y0 / 1430, x1 / 1105, y1 / 1430]);
  const ROWS_PX = [[1188, 1247], [1248, 1302], [1303, 1359]];
  const rowHL = ROWS_PX.map(([a, b]) => {
    const h = new kit.HighlightRect(px(182, a, 933, b), { color: ORANGE, fillOpacity: 0.16, padding: 0.003, lineWidth: 0.005 });
    group.add(h);
    return h;
  });
  const unitHL = ROWS_PX.map(([a, b]) => {
    const h = new kit.HighlightRect(px(620, a + 3, 931, b - 3), { color: ORANGE, fillOpacity: 0.22, padding: 0.002, lineWidth: 0.005 });
    group.add(h);
    return h;
  });

  // ---------------------------------------------------------------- floating board
  const BOARD_W = 0.94, BOARD_H = 0.5;
  const board = new THREE.Group();
  board.position.set(0, -0.115, 0.02); // bottom edge just above the printed table
  group.add(board);
  const backing = new kit.Panel({ width: BOARD_W, height: BOARD_H, opacity: 1, border: P.panelEdge, radius: 0.02 });
  board.add(backing);

  const Z = 0.003;
  // Row of coloured text pieces laid out left to right; returns piece extents for strikes.
  const row = (parent, pieces, { x = 0, y = 0, size = 0.036, align = 'center' } = {}) => {
    const items = pieces.map((p) => {
      const l = new kit.Label(p.text, { size, color: p.color ?? INK, halo: false, align: 'left', weight: p.weight ?? 600 });
      parent.add(l);
      return { label: l, w: l.worldSize.width };
    });
    // a halo-less Label has 0.14 em of padding on each side: overlap it so pieces join seamlessly
    const pad = size * 0.35 * 0.4;
    const total = items.reduce((a, it) => a + it.w - 2 * pad, 0);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    const x0 = cx;
    for (const it of items) { it.label.position.set(cx - pad, y, Z); it.x0 = cx; it.x1 = cx + it.w - 2 * pad; it.y = y; cx = it.x1; }
    return { items, x0, x1: cx, total, y, size };
  };
  const strike = (parent, item, size) => {
    const r = new kit.Ribbon([[item.x0 - size * 0.05, item.y - size * 0.12], [item.x1 + size * 0.05, item.y + size * 0.12]], { width: 0.0045, color: RED, z: Z + 0.002 });
    r.renderOrder = 22;
    parent.add(r);
    return r;
  };
  const fracBar = (parent, x0, x1, y) => {
    const r = new kit.Ribbon([[x0, y], [x1, y]], { width: 0.0035, color: INK, z: Z });
    r.renderOrder = 21;
    parent.add(r);
    return r;
  };
  const sub = () => { const g = new THREE.Group(); board.add(g); return g; };

  // ---- step 0: general rate equation, orders are not the coefficients
  const intro = sub();
  row(intro, [
    { text: 'Rate = k[A]' }, { text: '^x', color: PURPLE, weight: 800 }, { text: '[B]' }, { text: '^y', color: PURPLE, weight: 800 },
  ], { y: 0.175, size: 0.06 });
  row(intro, [
    { text: 'a', color: P.inkSoft, weight: 800 }, { text: 'A + ' }, { text: 'b', color: P.inkSoft, weight: 800 }, { text: kit.chem('B -> products') },
  ], { y: 0.085, size: 0.042 });
  const neq = sub();
  intro.add(neq);
  row(neq, [{ text: 'x', color: PURPLE, weight: 800 }, { text: ' ≠ ', color: RED, weight: 800 }, { text: 'a', color: P.inkSoft, weight: 800 }], { x: -0.15, y: -0.025, size: 0.06 });
  row(neq, [{ text: 'y', color: PURPLE, weight: 800 }, { text: ' ≠ ', color: RED, weight: 800 }, { text: 'b', color: P.inkSoft, weight: 800 }], { x: 0.15, y: -0.025, size: 0.06 });
  const introNote = new kit.Label('x, y = orders of reaction,\nfound only by experiment', { size: 0.034, color: PURPLE, halo: false });
  introNote.position.set(0, -0.155, Z);
  intro.add(introNote);

  // ---- header from step 1 on: single reactant + unit of rate
  const header = sub();
  row(header, [{ text: 'Rate = k[A]' }, { text: '^n', color: PURPLE, weight: 800 }], { x: -0.22, y: 0.185, size: 0.055 });
  const rateTag = new kit.Label('rate: mol dm^-3 s^-1', { size: 0.036, color: '#ffffff', background: ORANGE, bgOpacity: 1, weight: 700 });
  rateTag.position.set(0.215, 0.185, Z);
  header.add(rateTag);

  // ---- order tabs (n = 0, 1, 2)
  const tabs = sub();
  const TAB_X = [-0.3, 0, 0.3];
  const TAB_TEXT = ['n = 0  Zeroth', 'n = 1  First', 'n = 2  Second'];
  const tabMarker = new kit.Panel({ width: 0.27, height: 0.058, color: '#fff4e6', opacity: 1, border: ORANGE, borderWidth: 0.004, radius: 0.012 });
  tabMarker.position.set(0, 0.105, 0.0015);
  tabs.add(tabMarker);
  const tabLabels = TAB_TEXT.map((s, i) => {
    const l = new kit.Label(s, { size: 0.032, color: PURPLE, halo: false });
    l.position.set(TAB_X[i], 0.105, Z);
    tabs.add(l);
    return l;
  });

  // ---- derivations
  const YA = 0.025, YNUM = -0.055, YBAR = -0.087, YDEN = -0.118, YRES = -0.192;
  const SZ = 0.038;
  const resultLabel = (text) => {
    const l = new kit.Label(text, { size: 0.044, color: '#ffffff', background: ORANGE, bgOpacity: 1, weight: 700 });
    l.position.set(0, YRES, Z + 0.001);
    return l;
  };
  const deriv = [];

  // n = 0
  {
    const g = sub();
    const a = row(g, [{ text: 'mol dm^-3 s^-1', color: ORANGE }, { text: ' = k × ' }, { text: '(mol dm^-3)^0' }], { y: YA, size: SZ });
    const br = a.items[2];
    const one = new THREE.Group(); g.add(one);
    const oneL = new kit.Label('= 1', { size: 0.034, color: RED, halo: false, weight: 700 });
    oneL.position.set((br.x0 + br.x1) / 2, YA - 0.05, Z);
    one.add(oneL);
    const lineB = new THREE.Group(); g.add(lineB);
    row(lineB, [{ text: 'mol dm^-3 s^-1', color: ORANGE }, { text: ' = k × 1' }], { y: YDEN + 0.005, size: SZ });
    const res = resultLabel('k = mol dm^-3 s^-1'); g.add(res);
    deriv.push({ g, parts: [[one, 1.3], [lineB, 2.4]], strikes: [], res, resAt: 3.7 });
  }
  // n = 1 and n = 2: k = rate / [A]^n as a fraction, cancel common mol dm^-3
  const fractionDeriv = (n) => {
    const g = sub();
    row(g, [{ text: 'mol dm^-3 s^-1', color: ORANGE }, { text: ' = k × ' }, { text: n === 1 ? '(mol dm^-3)' : '(mol dm^-3)^2' }], { y: YA, size: SZ });
    const frac = new THREE.Group(); g.add(frac);
    const fx = n === 1 ? -0.02 : -0.1; // centre of the fraction
    const num = row(frac, [{ text: 'mol dm^-3', color: ORANGE }, { text: ' s^-1', color: ORANGE }], { x: fx, y: YNUM, size: SZ });
    const den = row(frac, n === 1 ? [{ text: 'mol dm^-3' }] : [{ text: 'mol dm^-3' }, { text: ' × ' }, { text: 'mol dm^-3' }], { x: fx, y: YDEN, size: SZ });
    const w = Math.max(num.total, den.total);
    fracBar(frac, fx - w / 2, fx + w / 2, YBAR);
    const kEq = new kit.Label('k =', { size: SZ, halo: false, align: 'right' });
    kEq.position.set(fx - w / 2 - 0.01, YBAR, Z);
    frac.add(kEq);
    const s1 = strike(g, num.items[0], SZ);
    const s2 = strike(g, den.items[0], SZ);
    const parts = [[frac, 1.1]];
    let hint = null;
    if (n === 2) {
      hint = new THREE.Group(); g.add(hint);
      const h = new kit.Label('s^-1 ÷ (mol dm^-3)\n= mol^-1 dm^3 s^-1', { size: 0.03, color: PURPLE, halo: false, align: 'left', lineHeight: 1.35 });
      h.position.set(0.11, (YNUM + YDEN) / 2, Z);
      hint.add(h);
      parts.push([hint, 3.4]);
    }
    const res = resultLabel(n === 1 ? 'k = s^-1' : 'k = mol^-1 dm^3 s^-1'); g.add(res);
    return { g, parts, strikes: [s1, s2], strikeAt: 2.1, res, resAt: n === 1 ? 3.6 : 4.4 };
  };
  deriv.push(fractionDeriv(1), fractionDeriv(2));

  // ---- summary (final step): the three results as a mini table
  const summary = sub();
  const SUM = [
    ['Zeroth', 'rate = k[A]^0', 'mol dm^-3 s^-1'],
    ['First', 'rate = k[A]^1', 's^-1'],
    ['Second', 'rate = k[A]^2', 'mol^-1 dm^3 s^-1'],
  ];
  SUM.forEach(([o, eq, u], i) => {
    const y = 0.09 - i * 0.1;
    const lo = new kit.Label(o, { size: 0.036, color: PURPLE, halo: false });
    lo.position.set(-0.33, y, Z);
    const le = new kit.Label(eq, { size: 0.036, halo: false });
    le.position.set(-0.07, y, Z);
    const lu = new kit.Label(u, { size: 0.036, color: '#ffffff', background: ORANGE, bgOpacity: 1, weight: 700 });
    lu.position.set(0.27, y, Z);
    summary.add(lo, le, lu);
  });
  const sumNote = new kit.Label('rate in mol dm^-3 s^-1  (k: mol^-1 dm^3 s^-1 = dm^3 mol^-1 s^-1)', { size: 0.026, color: P.inkSoft, halo: false });
  sumNote.position.set(0, -0.2, Z);
  summary.add(sumNote);

  // pointer arrow from the board down to the table (lies on the page)
  const pointer = new kit.Arrow({ from: [0.38, -0.33, 0.03], to: [0.38, -0.395, 0.012], color: ORANGE, radius: 0.004, headLength: 0.02, headRadius: 0.01 });
  group.add(pointer);

  const pop = (e, at) => kit.ease.outBack(kit.clamp((e - at) / 0.45));

  return {
    group,
    update(t) {
      const lt = kit.loop(t, T);
      const s = captions(t);
      const i = s.index;
      const e = s.elapsed; // seconds into the current step
      const stepEnv = (k) => (i === k ? kit.envelope(e, 0, STEPS[k].duration, 0.35) : 0);

      // NOTE: kit.setOpacity is not hierarchical (a later call on a child overwrites it), so
      // every alpha below is multiplied out explicitly with its parents' alphas.
      const B = Math.min(kit.invLerp(0, 0.4, lt), 1 - kit.invLerp(T - 0.35, T, lt));
      kit.setOpacity(backing, B);

      // intro
      const introA = B * (i === 0 ? 1 - kit.invLerp(3.6, 4, lt) : 0);
      kit.setOpacity(intro, introA);
      kit.setOpacity(neq, introA * kit.invLerp(1.2, 1.8, lt));
      kit.setOpacity(introNote, introA * kit.invLerp(2.0, 2.6, lt));

      // header + tabs
      const headA = B * (i >= 1 ? kit.invLerp(START[1], START[1] + 0.5, lt) : 0);
      kit.setOpacity(header, headA);
      kit.setOpacity(rateTag, headA * (i >= 1 ? kit.invLerp(START[1] + 0.8, START[1] + 1.3, lt) : 0));
      const tabsA = B * (i >= 1 && i <= 4 ? Math.min(kit.invLerp(START[1] + 1.5, START[1] + 2.2, lt), i === 4 ? 1 - kit.invLerp(START[5] - 0.3, START[5], lt) : 1) : 0);
      kit.setOpacity(tabs, tabsA);
      tabLabels.forEach((l, k) => kit.setOpacity(l, tabsA * (i >= 2 && i - 2 !== k ? 0.45 : 1)));
      if (i >= 2 && i <= 4) {
        const prev = i === 2 ? TAB_X[0] : TAB_X[i - 3];
        tabMarker.position.x = kit.lerp(prev, TAB_X[i - 2], kit.tween(e, 0, 0.5));
        kit.setOpacity(tabMarker, tabsA);
      } else kit.setOpacity(tabMarker, 0);

      // derivations
      deriv.forEach((d, k) => {
        const on = B * stepEnv(k + 2);
        kit.setOpacity(d.g, on);
        if (!on) return;
        for (const [obj, at] of d.parts) kit.setOpacity(obj, on * kit.invLerp(at, at + 0.5, e));
        for (const st of d.strikes) st.setProgress(kit.tween(e, d.strikeAt, 0.6));
        kit.setOpacity(d.res, on * kit.invLerp(d.resAt, d.resAt + 0.25, e));
        d.res.scale.setScalar(0.75 + 0.25 * pop(e, d.resAt));
      });

      // summary
      kit.setOpacity(summary, B * (i === 5 ? kit.invLerp(START[5], START[5] + 0.5, lt) : 0));

      // printed-table highlights
      rowHL.forEach((h, k) => { kit.setOpacity(h, stepEnv(k + 2)); h.update(t); });
      unitHL.forEach((h, k) => { kit.setOpacity(h, i === 5 ? kit.invLerp(START[5] + 0.3 + k * 0.25, START[5] + 0.7 + k * 0.25, lt) : 0); h.update(t); });
      kit.setOpacity(pointer, i >= 2 ? 1 : 0);
      pointer.setProgress(0.5 + 0.5 * kit.pingpong(t, 1.6));
    },
    dispose() {
      kit.disposeObject(group);
    },
  };
}
