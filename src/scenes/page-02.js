// Page 2 - II) Order of reaction: zeroth / first / second order graphs.
// Three concentration-time panels float in the blank space ABOVE the printed comparison grid and
// three rate-concentration panels in the blank space BELOW it, column by column, so the printed
// grid stays visible. A synchronised cursor runs down each [A]-time curve with a live tangent
// (gradient = rate) and a rate bar; the same cursor is then projected onto the rate-[A] graphs.
// Axes carry no numbers (the page has no numeric scale).  Contract: docs/SCENE_CONTRACT.md
export default function createScene(ctx) {
  const { THREE, kit } = ctx;
  const P = kit.palette;
  const group = new THREE.Group();

  const STEPS = [
    { duration: 5, caption: kit.chem('Concentration-time graphs for A -> products') },
    { duration: 10, caption: 'Gradient of the curve = rate at that moment' },
    { duration: 7, caption: 'Rate vs concentration: the same three reactions' },
    { duration: 7, caption: 'First order: rate directly proportional to [A]' },
    { duration: 5, caption: 'Second order: rate vs [A]^2 is a straight line' },
    { duration: 2.5, caption: 'Unit of k depends on the order' },
  ];
  const captions = kit.captionTrack(ctx, STEPS);
  const T = kit.totalDuration(STEPS);
  const S = []; { let s = 0; for (const st of STEPS) { S.push(s); s += st.duration; } }

  // ---------------------------------------------------------------- kinetics (arbitrary units)
  // [A]0 = 1. Zeroth: straight line reaching 0 at x = XZ (then the reaction stops).
  // First: exponential decay, approaches 0. Second: 1/(1 + k t), same initial gradient as first,
  // flattens well above 0 ("flat, not near 0").
  const XZ = 0.85, K = 3;
  const ORD = [
    { name: 'Zeroth', title: 'Zeroth: Rate = k', color: P.primary, A: (x) => Math.max(0, 1 - x / XZ), dA: () => -1 / XZ, rel: () => 1, xEnd: XZ, unit: 'k: mol dm^-3 s^-1' },
    { name: 'First', title: 'First: Rate = k[A]', color: P.tertiary, A: (x) => Math.exp(-K * x), dA: (x) => -K * Math.exp(-K * x), rel: (a) => a, xEnd: 1, unit: 'k: s^-1' },
    { name: 'Second', title: 'Second: Rate = k[A]^2', color: P.quaternary, A: (x) => 1 / (1 + K * x), dA: (x) => -K / (1 + K * x) ** 2, rel: (a) => a * a, xEnd: 1, unit: 'k: mol^-1 dm^3 s^-1' },
  ];
  const CX = [-0.325, 0, 0.325];
  const W = 0.31, FS = 0.024;
  const TOP_Y = 0.5, BAR_Y = 0.345, BOT_Y = -0.425;

  // ---------------------------------------------------------------- helpers
  const barGeom = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0); // shared, disposed via meshes
  const flatMesh = (geom, color, opacity = 1) => new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, toneMapped: false, side: THREE.DoubleSide }));
  const ringPoints = (r, n = 40) => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * Math.PI * 2) * r, Math.sin((i / n) * Math.PI * 2) * r]);
  const LAYER_MARK = 0.0048, LAYER_LABEL = 0.006;

  const cols = ORD.map((o, i) => {
    const c = { o };
    // ---- concentration-time panel
    const g = new kit.Graph2D({
      width: W, height: 0.255, fontSize: FS, grid: false, title: o.title, backgroundOpacity: 1,
      x: { min: 0, max: 1.05, label: 'Time', showTicks: false },
      y: { min: 0, max: 1.12, label: '[A]', showTicks: false },
    });
    g.position.set(CX[i], TOP_Y, 0.006);
    group.add(g);
    c.top = g;
    c.curve = g.plot(o.A, { color: o.color, width: 0.006, domain: [0, o.xEnd], samples: 160 });
    // live tangent: unit ribbon along +x, posed every frame (no geometry rebuilds)
    c.tan = new kit.Ribbon([[0, 0], [1, 0]], { width: 0.0055, color: P.danger });
    c.tan.position.z = 0.0042;
    g.add(c.tan);
    c.dot = g.point(0, 1, { color: P.ink, radius: 0.0075 });
    // short notes in the free upper-right corner of each plot (clear of the curves)
    const notes = ['Rate = k,\nconstant', 'steep →\nflat', 'steep → flat,\nnot near 0'];
    c.note = g.label(notes[i], [0.8, 0.8, 0.74][i], 0.84, { size: 0.02, color: o.color, background: '#ffffff', bgOpacity: 1, lineHeight: 1.15 });

    // ---- rate bar under the panel
    const bar = new THREE.Group();
    bar.position.set(CX[i], BAR_Y, 0.006);
    group.add(bar);
    bar.add(new kit.Panel({ width: W, height: 0.05, opacity: 1, radius: 0.01 }));
    const barInner = new THREE.Group(); bar.add(barInner);
    const bl = new kit.Label('Rate', { size: 0.024, halo: false, align: 'left' });
    bl.position.set(-W / 2 + 0.008, 0, 0.002);
    barInner.add(bl);
    const trackX = -W / 2 + 0.075, trackW = W - 0.09;
    const track = flatMesh(barGeom, P.grid);
    track.scale.set(trackW, 0.016, 1); track.position.set(trackX, 0, 0.001);
    const fill = flatMesh(barGeom, o.color);
    fill.scale.set(trackW, 0.016, 1); fill.position.set(trackX, 0, 0.0015);
    track.renderOrder = 1; fill.renderOrder = 2;
    barInner.add(track, fill);
    c.bar = bar; c.barInner = barInner; c.fill = fill; c.trackW = trackW;

    // ---- rate-concentration panel
    const h = new kit.Graph2D({
      width: W, height: 0.24, fontSize: FS, grid: false, backgroundOpacity: 1,
      x: { min: 0, max: 1.1, label: '', showTicks: false },
      y: { min: 0, max: 1.1, label: 'Rate', showTicks: false },
      margin: { bottom: FS * 2.6, top: FS * 0.9 },
    });
    h.position.set(CX[i], BOT_Y, 0.006);
    group.add(h);
    c.bot = h;
    const xl = (text) => {
      const l = new kit.Label(text, { size: FS, weight: 600, halo: false, anchorY: 'bottom' });
      l.position.set((h.plotRect.x0 + h.plotRect.x1) / 2, -0.12 + FS * 0.3, LAYER_LABEL);
      h.add(l);
      return l;
    };
    c.xlA = xl('[A]');
    c.marker = h.point(1, 1, { color: o.color, radius: 0.0075 });
    c.extras = [];

    // ---- unit of k
    // shown in the rate-bar strip in the last step (the page bottom is under the caption bar)
    const u = new kit.Label(o.unit, { size: 0.027, color: o.color, halo: false, weight: 700 });
    u.position.set(0, 0, 0.003);
    bar.add(u);
    c.unit = u;
    return c;
  });

  // zeroth: horizontal line at rate = k, slope = 0, "k" on the rate axis
  const RK = 0.6;
  const z = cols[0];
  z.rline = z.bot.plot([[0, RK], [1.0, RK]], { color: z.o.color, width: 0.006 });
  z.extras.push(z.bot.label('slope = 0', 0.6, RK + 0.17, { size: 0.023 }));
  const kTick = new kit.Label('k', { size: 0.026, italic: true, halo: false, align: 'right' });
  { const p = z.bot.toLocal(0, RK); kTick.position.set(p.x - 0.008, p.y, LAYER_LABEL); }
  z.bot.add(kTick);
  z.extras.push(kTick);

  // first: straight line through the origin, slope = k, C = 0
  const SL = 0.95;
  const f = cols[1];
  f.rline = f.bot.plot((x) => SL * x, { color: f.o.color, width: 0.006, domain: [0, 1.05] });
  f.extras.push(f.bot.label('slope = k', 0.36, 0.78, { size: 0.023 }));
  const ring = new kit.Ribbon(ringPoints(0.013), { width: 0.0035, color: P.danger, closed: true });
  { const p = f.bot.toLocal(0, 0); ring.position.set(p.x, p.y, LAYER_LABEL); }
  f.bot.add(ring);
  f.ring = ring;
  const c0 = new kit.Label('C = 0', { size: 0.022, color: P.danger, halo: false });
  { const p = f.bot.toLocal(0, 0); c0.position.set(p.x + 0.006, p.y - 0.026, LAYER_LABEL); }
  f.bot.add(c0);
  f.extras.push(c0);

  // second: parabola vs [A] that straightens as the axis becomes [A]^2 (flip-book of exponents)
  const s2 = cols[2];
  const NMORPH = 14;
  s2.morph = Array.from({ length: NMORPH }, (_, k) => {
    const q = 2 - k / (NMORPH - 1); // exponent 2 (vs [A]) -> 1 (vs [A]^2)
    const r = s2.bot.plot((u) => SL * Math.pow(u, q), { color: s2.o.color, width: 0.006, domain: [0, 1.05], samples: 120 });
    r.visible = false;
    return r;
  });
  s2.xlA2 = (() => {
    const l = new kit.Label('[A]^2', { size: FS, weight: 700, halo: false, anchorY: 'bottom', color: P.danger });
    l.position.copy(s2.xlA.position);
    s2.bot.add(l);
    return l;
  })();
  s2.slopeLbl = s2.bot.label('slope = k', 0.36, 0.78, { size: 0.023 });
  s2.curveLbl = s2.bot.label('curve', 0.75, 0.25, { size: 0.023 });

  // ---------------------------------------------------------------- pose helpers
  const v0 = new THREE.Vector3(), v1 = new THREE.Vector3();
  const poseTangent = (c, x, a, p) => {
    const o = c.o, g = c.top;
    const slope = o.dA(x);
    v0.copy(g.toLocal(x, a));
    v1.copy(g.toLocal(x + 0.01, a + slope * 0.01));
    const ang = Math.atan2(v1.y - v0.y, v1.x - v0.x);
    const L = 0.1;
    const back = L * 0.5 * kit.smoothstep(0, 0.12, p); // at t = 0 the segment starts at the dot
    c.tan.position.set(v0.x - Math.cos(ang) * back, v0.y - Math.sin(ang) * back, 0.0042);
    c.tan.rotation.z = ang;
    c.tan.scale.set(L, 1, 1);
  };
  // cursor progress (0..1 along each curve's own run) for the current time
  const cursorP = (lt) => {
    if (lt < S[1]) return 0;
    if (lt < S[2]) return kit.invLerp(S[1] + 0.5, S[2] - 0.6, lt);
    if (lt < S[3]) return kit.invLerp(S[2] + 1.6, S[3] - 0.5, lt) * 0.97;
    if (lt < S[4]) return kit.invLerp(S[3] + 1.6, S[4] - 0.5, lt) * 0.97;
    return 0;
  };

  return {
    group,
    update(t) {
      const lt = kit.loop(t, T);
      const s = captions(t);
      const i = s.index;
      const fadeAll = 1 - kit.invLerp(T - 0.35, T, lt); // fade out just before looping
      const p = cursorP(lt);
      const cursorOn = (i === 1 || i === 2 || i === 3) ? 1 : 0;

      cols.forEach((c, k) => {
        const o = c.o;
        // top panel + curve draw-on
        const topA = fadeAll * kit.invLerp(0, 0.5, lt);
        kit.setOpacity(c.top, topA);
        c.curve.setProgress(i === 0 ? kit.invLerp(0.6 + k * 0.4, 3.2 + k * 0.4, lt) : 1);
        // cursor, tangent, rate bar
        const x = p * o.xEnd;
        const a = o.A(x);
        c.dot.setData(x, a);
        poseTangent(c, x, a, p);
        kit.setOpacity(c.dot, topA * cursorOn);
        kit.setOpacity(c.tan, topA * cursorOn);
        const barA = fadeAll * kit.invLerp(S[1], S[1] + 0.5, lt);
        const unitA = i === 5 ? kit.invLerp(S[5], S[5] + 0.4, lt) : 0;
        kit.setOpacity(c.bar, barA);
        kit.setOpacity(c.barInner, barA * (1 - unitA));
        kit.setOpacity(c.unit, barA * unitA);
        c.fill.scale.x = Math.max(0.0001, c.trackW * o.rel(a));
        kit.setOpacity(c.note, topA * (i >= 2 ? kit.invLerp(S[2], S[2] + 0.6, lt) : 0));

        // bottom panel
        const botA = fadeAll * (i >= 2 ? kit.invLerp(S[2] + 0.2, S[2] + 0.8, lt) : 0);
        kit.setOpacity(c.bot, botA);
        // projected marker: ([A], rate) of the cursor
        const showMarker = (k === 0 && (i === 2 || i === 3)) || (k === 1 && i === 3);
        kit.setOpacity(c.marker, botA * (showMarker ? 1 : 0));
        if (k < 2) c.marker.setData(a, k === 0 ? RK : SL * a);
      });

      // zeroth rate line (step 2), first-order line + annotations (step 3)
      z.rline.setProgress(kit.invLerp(S[2] + 0.6, S[2] + 1.6, lt));
      for (const e of z.extras) kit.setOpacity(e, fadeAll * (i >= 2 ? kit.invLerp(S[2] + 1.4, S[2] + 1.9, lt) : 0));
      f.rline.setProgress(kit.invLerp(S[3], S[3] + 1.2, lt));
      kit.setOpacity(f.rline, fadeAll * (i >= 3 ? 1 : 0));
      kit.setOpacity(f.ring, fadeAll * (i >= 3 ? kit.invLerp(S[3] + 0.9, S[3] + 1.3, lt) : 0));
      f.ring.scale.setScalar(i === 3 ? 1 + 0.15 * Math.sin(t * 6) : 1);
      f.extras.forEach((e, k) => kit.setOpacity(e, fadeAll * (i >= 3 ? kit.invLerp(S[3] + 1.2 + k * 0.3, S[3] + 1.6 + k * 0.3, lt) : 0)));

      // second order: parabola vs [A], then straightens vs [A]^2
      const draw2 = i >= 4 ? kit.invLerp(S[4], S[4] + 1.1, lt) : 0;
      const m = i >= 4 ? kit.tween(lt, S[4] + 1.8, 1.4, kit.ease.inOutSine) : 0;
      const frame = Math.round(m * (NMORPH - 1));
      s2.morph.forEach((r, k) => {
        r.visible = draw2 > 0 && k === frame;
        if (r.visible) { kit.setOpacity(r, fadeAll); r.setProgress(draw2); }
      });
      const ax2 = i >= 4 ? kit.invLerp(S[4] + 1.6, S[4] + 2.2, lt) : 0;
      kit.setOpacity(s2.xlA, fadeAll * (i >= 2 ? kit.invLerp(S[2] + 0.2, S[2] + 0.8, lt) : 0) * (1 - ax2));
      kit.setOpacity(s2.xlA2, fadeAll * ax2);
      kit.setOpacity(s2.curveLbl, fadeAll * (i >= 4 ? kit.invLerp(S[4] + 0.8, S[4] + 1.1, lt) * (1 - ax2) : 0));
      kit.setOpacity(s2.slopeLbl, fadeAll * (i >= 4 ? kit.invLerp(S[4] + 3.3, S[4] + 3.7, lt) : 0));
    },
    dispose() {
      kit.disposeObject(group);
    },
  };
}
