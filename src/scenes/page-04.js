// Page 4 - O2 volume-time curves -> initial rate vs concentration -> order with respect to H2O2.
// AR overlay REGISTERED ONTO THE TWO PRINTED GRAPHS (no backing panels, so the printed figure stays
// readable): the five printed curves are traced in colour, a tangent is drawn at t = 0 on each, and
// its gradient "flies" down to become the matching point on the printed rate-concentration graph.
// The five points then get the straight line through the origin -> rate proportional to [H2O2] ->
// first order. No numeric slope or rate value is displayed (the printed values are eye-read).
// Contract: docs/SCENE_CONTRACT.md
export default function createScene(ctx) {
  const { THREE, kit, page } = ctx;
  const P = kit.palette;
  const group = new THREE.Group();

  const STEPS = [
    { duration: 6, caption: kit.chem('O2 volume vs time for 5 concentrations of H2O2(aq)') },
    { duration: 6, caption: 'Tangent at t = 0 gives the initial rate' },
    { duration: 6, caption: 'One experiment gives one point' },
    { duration: 9, caption: 'Repeat for each initial concentration' },
    { duration: 5, caption: 'Graph is a straight line through the origin' },
    { duration: 4, caption: kit.chem('Rate proportional to [H2O2(aq)]: first order') },
  ];
  const captions = kit.captionTrack(ctx, STEPS);
  const T = kit.totalDuration(STEPS); // 36 s
  const S = []; { let s = 0; for (const st of STEPS) { S.push(s); s += st.duration; } }

  // ---------------------------------------------------------------- calibration (image px, 1105 x 1430)
  const IMG_W = 1105, IMG_H = 1430;
  const img = (px, py) => page.uvToXY(px / IMG_W, py / IMG_H);
  // top graph: origin and scale measured from the tick marks
  const top = (t, v) => img(272.5 + t * 2.689, 530 - v * 14.14);
  // bottom graph: origin (359, 1156); 0.1 mol dm^-3 = 79 px, 0.1 cm3 s^-1 = 84.5 px
  const bot = (c, r) => img(359 + c * 790, 1156 - r * 845);

  // Printed curves, sampled from the page image (time / s, volume / cm3), approximate. Early
  // samples of curves 2-4 merge on the print, so they start at 15 s. Used only to trace the
  // printed curves; never displayed as numbers.
  const TS = [15, 20, 25, 30, 35, 40, 60, 70, 80, 90, 100, 110, 120, 135, 150, 165, 180];
  const CURVES = [
    { conc: 0.40, rate: 0.51, early: [[5, 2.79], [7.5, 4.21], [10, 5.34], [12.5, 6.72]], v: [7.99, 10.18, 12.34, 14.11, 15.7, 17.04, 20.86, 22.1, 23.13, 23.87, 24.5, 25.0, 25.35, 25.85, 26.1, 26.27, 26.34] },
    { conc: 0.32, rate: 0.41, early: [], v: [5.41, 6.86, 8.27, 9.41, 10.54, 11.49, 14.75, 15.95, 17.01, 17.86, 18.56, 19.2, 19.7, 20.26, 20.69, 20.9, 20.97] },
    { conc: 0.24, rate: 0.32, early: [], v: [4.49, 5.66, 6.82, 7.78, 8.7, 9.48, 11.99, 12.84, 13.54, 14.07, 14.46, 14.82, 15.1, 15.38, 15.59, 15.74, 15.81] },
    { conc: 0.16, rate: 0.215, early: [], v: [3.36, 4.21, 4.99, 5.69, 6.33, 6.82, 8.45, 8.95, 9.37, 9.65, 9.87, 10.08, 10.22, 10.36, 10.5, 10.57, 10.64] },
    { conc: 0.080, rate: 0.10, early: [[5, 0.5], [7.5, 0.74], [10, 0.92], [12.5, 1.17]], v: [1.34, 1.73, 2.09, 2.44, 2.72, 2.93, 3.85, 4.14, 4.42, 4.63, 4.84, 4.99, 5.13, 5.27, 5.41, 5.48, 5.55] },
  ];
  // initial-rate points as printed on the lower graph (x = concentration printed on the page)
  const COLORS = ['#1f6feb', '#e8590c', '#2f9e44', '#9c36b5', '#d6336c'];
  // printed concentration labels at the right of the top graph (for highlighting)
  const TAG_PX = [[762, 140, 897, 178], [762, 212, 897, 250], [762, 284, 897, 322], [762, 357, 897, 395], [762, 429, 905, 467]];

  // monotone cubic (Fritsch-Carlson) through the samples; returns f(t) and f'(0)
  function pchip(xs, ys) {
    const n = xs.length, h = [], d = [], m = new Array(n).fill(0);
    for (let k = 0; k < n - 1; k++) { h[k] = xs[k + 1] - xs[k]; d[k] = (ys[k + 1] - ys[k]) / h[k]; }
    const end = (h0, h1, d0, d1) => { let s = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1); if (Math.sign(s) !== Math.sign(d0)) s = 0; else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(s) > Math.abs(3 * d0)) s = 3 * d0; return s; };
    m[0] = end(h[0], h[1], d[0], d[1]);
    m[n - 1] = end(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
    for (let k = 1; k < n - 1; k++) {
      if (d[k - 1] * d[k] <= 0) m[k] = 0;
      else { const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1]; m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]); }
    }
    const f = (x) => {
      let k = 0;
      while (k < n - 2 && x > xs[k + 1]) k++;
      const s = kit.clamp((x - xs[k]) / h[k]), s2 = s * s, s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * ys[k] + (s3 - 2 * s2 + s) * h[k] * m[k] + (-2 * s3 + 3 * s2) * ys[k + 1] + (s3 - s2) * h[k] * m[k + 1];
    };
    return { f, slope0: m[0] };
  }

  const Z = 0.004;
  const ribbon = (pts, opts) => { const r = new kit.Ribbon(pts.map((p) => [p.x, p.y]), { z: Z, ...opts }); group.add(r); return r; };
  const disc = (radius, color) => new THREE.Mesh(new THREE.CircleGeometry(radius, 28), new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true }));

  // ---------------------------------------------------------------- curves + tangents (top graph)
  const viz = CURVES.map((c, k) => {
    const xs = [0, ...c.early.map((p) => p[0]), ...TS];
    const ys = [0, ...c.early.map((p) => p[1]), ...c.v];
    const { f, slope0 } = pchip(xs, ys);
    const pts = [];
    for (let i = 0; i <= 180; i++) pts.push(top(i, f(i)));
    const curve = ribbon(pts, { width: 0.0055, color: COLORS[k] });
    curve.renderOrder = 3;
    // tangent at t = 0 (through the origin with the curve's own initial gradient)
    const tEnd = Math.min(27.5 / slope0, 75);
    const tan = ribbon([top(0, 0), top(tEnd, slope0 * tEnd)], { width: 0.005, color: P.danger });
    tan.renderOrder = 4;
    const hl = new kit.HighlightRect(page.bboxToRect(TAG_PX[k].map((v, j) => v / (j % 2 ? IMG_H : IMG_W))), { color: COLORS[k], fillOpacity: 0.18, padding: 0.004, lineWidth: 0.004 });
    group.add(hl);
    // marker on the lower graph (printed point)
    const mk = new THREE.Group();
    const ring = disc(0.012, '#ffffff'); const dot = disc(0.0085, COLORS[k]); dot.position.z = 0.0006;
    mk.add(ring, dot);
    const pp = bot(c.conc, c.rate);
    mk.position.set(pp.x, pp.y, Z + 0.002);
    mk.renderOrder = 6; ring.renderOrder = 6; dot.renderOrder = 7;
    group.add(mk);
    // flight: from the tangent's midpoint to the lower point (arc above the page)
    const a = top(tEnd * 0.5, slope0 * tEnd * 0.5);
    const fly = { from: new THREE.Vector3(a.x, a.y, Z), to: new THREE.Vector3(pp.x, pp.y, Z + 0.002) };
    return { c, curve, tan, tEnd, slope0, hl, mk, fly };
  });

  // flying "gradient" token (one, reused)
  const token = new THREE.Mesh(new THREE.SphereGeometry(0.012, 20, 14), new THREE.MeshStandardMaterial({ color: P.danger, roughness: 0.35, emissive: P.danger, emissiveIntensity: 0.25 }));
  group.add(token);
  const tokenLabel = new kit.Label('initial rate', { size: 0.026, billboard: true, background: '#ffffff', bgOpacity: 1, color: P.danger });
  group.add(tokenLabel);

  // ---------------------------------------------------------------- step-1 annotations
  const v1 = viz[0];
  const tanTop = top(v1.tEnd, v1.slope0 * v1.tEnd);
  const tanLabel = new kit.Label('tangent at t = 0', { size: 0.026, color: P.danger, background: '#ffffff', bgOpacity: 1, align: 'left' });
  tanLabel.position.set(tanTop.x + 0.012, tanTop.y + 0.005, Z + 0.004);
  group.add(tanLabel);
  const TA = 6, TB = 26;
  const tri = [
    ribbon([top(TA, v1.slope0 * TA), top(TB, v1.slope0 * TA)], { width: 0.0035, color: P.ink, dashed: true, dash: 0.01, gap: 0.006 }),
    ribbon([top(TB, v1.slope0 * TA), top(TB, v1.slope0 * TB)], { width: 0.0035, color: P.ink, dashed: true, dash: 0.01, gap: 0.006 }),
  ];
  tri.forEach((r) => { r.renderOrder = 5; });
  const dtL = new kit.Label('Δt', { size: 0.026, halo: true });
  { const p = top((TA + TB) / 2, v1.slope0 * TA); dtL.position.set(p.x, p.y - 0.018, Z + 0.004); }
  const dvL = new kit.Label('ΔV', { size: 0.026, halo: true, align: 'left' });
  { const p = top(TB, v1.slope0 * (TA + TB) / 2); dvL.position.set(p.x + 0.008, p.y, Z + 0.004); }
  group.add(dtL, dvL);
  // explanation in the blank top margin above the printed graph
  const rateNote = new kit.Label('initial rate = gradient of the tangent at t = 0 (= ΔV / Δt)', { size: 0.028, color: P.danger, background: '#ffffff', bgOpacity: 1, border: P.danger });
  { const p = img(552, 52); rateNote.position.set(p.x, p.y, Z + 0.004); }
  group.add(rateNote);

  // guides for the first point: x = initial concentration, y = initial rate
  const g1 = bot(CURVES[0].conc, CURVES[0].rate);
  const guideV = ribbon([bot(CURVES[0].conc, 0), g1], { width: 0.0035, color: COLORS[0], dashed: true, dash: 0.01, gap: 0.006 });
  const guideH = ribbon([bot(0, CURVES[0].rate), g1], { width: 0.0035, color: COLORS[0], dashed: true, dash: 0.01, gap: 0.006 });
  const concL = new kit.Label('initial [H_2O_2]', { size: 0.024, color: COLORS[0], background: '#ffffff', bgOpacity: 1 });
  { const p = bot(CURVES[0].conc, 0.035); concL.position.set(p.x + 0.07, p.y, Z + 0.004); }
  const rateL = new kit.Label('initial rate', { size: 0.024, color: COLORS[0], background: '#ffffff', bgOpacity: 1 });
  { const p = bot(0.17, CURVES[0].rate); rateL.position.set(p.x, p.y + 0.02, Z + 0.004); }
  group.add(concL, rateL);

  // ---------------------------------------------------------------- best-fit line, origin, doubling
  // least-squares line through the origin over the five printed points (drawn, slope not shown)
  const sxy = CURVES.reduce((a, c) => a + c.conc * c.rate, 0), sxx = CURVES.reduce((a, c) => a + c.conc * c.conc, 0);
  const m = sxy / sxx;
  const lineEnd = 0.42;
  const fitLine = ribbon([bot(0, 0), bot(lineEnd, m * lineEnd)], { width: 0.0055, color: P.danger });
  fitLine.renderOrder = 5;
  const o = bot(0, 0);
  const originRing = new kit.Ribbon(Array.from({ length: 40 }, (_, i) => [Math.cos((i / 40) * Math.PI * 2) * 0.018, Math.sin((i / 40) * Math.PI * 2) * 0.018]), { width: 0.004, color: P.danger, closed: true });
  originRing.position.set(o.x, o.y, Z + 0.002);
  group.add(originRing);
  const lineNote = new kit.Label('straight line\nthrough the origin', { size: 0.03, color: P.danger, background: '#ffffff', bgOpacity: 1, border: P.danger, lineHeight: 1.2 });
  { const p = bot(0.43, 0.16); lineNote.position.set(p.x, p.y, Z + 0.004); }
  group.add(lineNote);
  // doubling: point 4 (0.16) -> point 2 (0.32)
  const c4 = CURVES[3], c2 = CURVES[1];
  const dblH = ribbon([bot(c4.conc, c4.rate), bot(c2.conc, c4.rate)], { width: 0.0045, color: P.ink });
  const dblV = ribbon([bot(c2.conc, c4.rate), bot(c2.conc, c2.rate)], { width: 0.0045, color: P.ink });
  const xL = new kit.Label('[H_2O_2] × 2', { size: 0.026, background: '#ffffff', bgOpacity: 1 });
  { const p = bot((c4.conc + c2.conc) / 2, c4.rate); xL.position.set(p.x, p.y - 0.024, Z + 0.004); }
  const yL = new kit.Label('rate ≈ × 2', { size: 0.026, background: '#ffffff', bgOpacity: 1, align: 'left' });
  { const p = bot(c2.conc, (c4.rate + c2.rate) / 2); yL.position.set(p.x + 0.012, p.y, Z + 0.004); }
  group.add(xL, yL);
  const finalNote = new kit.Label(kit.chem('Initial rate ∝ [H2O2(aq)]\n⇒ first order with respect to H2O2(aq)'), { size: 0.03, color: '#ffffff', background: P.danger, bgOpacity: 1, lineHeight: 1.25 });
  { const p = bot(0.42, 0.052); finalNote.position.set(p.x, p.y, Z + 0.005); }
  group.add(finalNote);

  // ---------------------------------------------------------------- schedule
  const drawWin = (k) => [0.3 + k * 1.1, 1.4 + k * 1.1];
  // when each curve's tangent / flight / point happen
  const SCHED = viz.map((_, k) => {
    if (k === 0) return { tan: S[1] + 0.5, tanDur: 1.2, fly: S[2] + 0.5, flyDur: 2.0 };
    const s0 = S[3] + (k - 1) * 2.25;
    return { tan: s0, tanDur: 0.6, fly: s0 + 0.7, flyDur: 1.1 };
  });
  const activeAt = (lt) => {
    if (lt < S[1]) return -1;
    if (lt < S[3]) return 0;
    if (lt < S[4]) return Math.min(4, 1 + Math.floor((lt - S[3]) / 2.25));
    return -1;
  };

  return {
    group,
    update(t) {
      const lt = kit.loop(t, T);
      const s = captions(t);
      const i = s.index;
      const fade = 1 - kit.invLerp(T - 0.4, T, lt);
      const act = activeAt(lt);

      let flying = null;
      viz.forEach((v, k) => {
        const sc = SCHED[k];
        // curve draw-on (step 0) and emphasis of the active run
        const [d0, d1] = drawWin(k);
        v.curve.setProgress(kit.invLerp(d0, d1, lt));
        const dim = act >= 0 && act !== k ? 0.25 : 1;
        kit.setOpacity(v.curve, fade * dim * (lt > d0 ? 1 : 0));
        // concentration-label highlight while drawing and while active
        const hlA = Math.max(i === 0 ? kit.envelope(lt, d0, d1 + 0.5, 0.25) : 0, act === k ? 1 : 0);
        kit.setOpacity(v.hl, fade * hlA);
        v.hl.update(t);
        // tangent
        v.tan.setProgress(kit.tween(lt, sc.tan, sc.tanDur, kit.ease.outCubic));
        // red while it is being analysed, then the run's own colour (tangents get shallower 1 -> 5)
        v.tan.setColor(act === k ? P.danger : COLORS[k]);
        kit.setOpacity(v.tan, fade * (lt > sc.tan ? (act === k ? 1 : act >= 0 ? 0.35 : 0.8) : 0));
        // flight + point
        const fp = kit.clamp((lt - sc.fly) / sc.flyDur);
        if (fp > 0 && fp < 1) flying = { v, k, f: fp };
        kit.setOpacity(v.mk, fade * (lt >= sc.fly + sc.flyDur ? 1 : 0));
        const pop = kit.clamp((lt - sc.fly - sc.flyDur) / 0.35);
        v.mk.scale.setScalar(pop < 1 ? 0.6 + 0.4 * kit.ease.outBack(pop) : 1);
      });

      // flying gradient token (arc above the page)
      if (flying) {
        const { v, k, f } = flying;
        const e = kit.ease.inOutCubic(f);
        token.position.lerpVectors(v.fly.from, v.fly.to, e);
        token.position.z += Math.sin(Math.PI * e) * 0.16;
        token.material.color.set(COLORS[k]);
        token.material.emissive.set(COLORS[k]);
        token.visible = true;
        kit.setOpacity(tokenLabel, fade * (k === 0 ? 1 : 0));
        tokenLabel.position.set(token.position.x, token.position.y, token.position.z + 0.03);
      } else {
        token.visible = false;
        kit.setOpacity(tokenLabel, 0);
      }

      // step-1 annotations (curve 1)
      kit.setOpacity(tanLabel, fade * (i === 1 || i === 2 ? kit.invLerp(S[1] + 1.4, S[1] + 1.9, lt) : 0));
      const triA = i === 1 || i === 2 ? kit.invLerp(S[1] + 2.2, S[1] + 2.8, lt) : 0;
      for (const o2 of [...tri, dtL, dvL]) kit.setOpacity(o2, fade * triA);
      kit.setOpacity(rateNote, fade * (i >= 1 && i <= 3 ? kit.invLerp(S[1] + 3.0, S[1] + 3.6, lt) : 0));

      // first point: coordinate guides
      const gA = i === 2 ? kit.invLerp(S[2] + 2.7, S[2] + 3.3, lt) : 0;
      guideV.setProgress(gA); guideH.setProgress(gA);
      kit.setOpacity(guideV, fade * (gA > 0 ? 1 : 0)); kit.setOpacity(guideH, fade * (gA > 0 ? 1 : 0));
      kit.setOpacity(concL, fade * (i === 2 ? kit.invLerp(S[2] + 3.4, S[2] + 3.9, lt) : 0));
      kit.setOpacity(rateL, fade * (i === 2 ? kit.invLerp(S[2] + 3.9, S[2] + 4.4, lt) : 0));

      // straight line through the origin
      fitLine.setProgress(kit.tween(lt, S[4] + 0.3, 1.6));
      kit.setOpacity(fitLine, fade * (lt > S[4] + 0.3 ? 1 : 0));
      kit.setOpacity(originRing, fade * (i >= 4 ? kit.invLerp(S[4] + 1.6, S[4] + 2.0, lt) : 0));
      originRing.scale.setScalar(i === 4 ? 1 + 0.18 * Math.sin(t * 6) : 1);
      kit.setOpacity(lineNote, fade * (i === 4 ? kit.invLerp(S[4] + 2.0, S[4] + 2.5, lt) : 0));

      // doubling and conclusion
      const dA = i === 5 ? kit.tween(lt, S[5] + 0.1, 0.8) : 0;
      dblH.setProgress(dA); kit.setOpacity(dblH, fade * (dA > 0 ? 1 : 0));
      const dB = i === 5 ? kit.tween(lt, S[5] + 0.8, 0.8) : 0;
      dblV.setProgress(dB); kit.setOpacity(dblV, fade * (dB > 0 ? 1 : 0));
      kit.setOpacity(xL, fade * (i === 5 ? kit.invLerp(S[5] + 0.6, S[5] + 0.9, lt) : 0));
      kit.setOpacity(yL, fade * (i === 5 ? kit.invLerp(S[5] + 1.4, S[5] + 1.7, lt) : 0));
      kit.setOpacity(finalNote, fade * (i === 5 ? kit.invLerp(S[5] + 1.9, S[5] + 2.4, lt) : 0));
    },
    dispose() {
      kit.disposeObject(group);
    },
  };
}
