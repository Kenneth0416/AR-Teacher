// Page 6 - Solution: graph of 1/t against volume of Na2S2O3(aq).
// A floating table (volume, time) gains a 1/t column; each row then flies up as a point onto a
// graph laid exactly over the printed one (x 0-35 cm3, y 0-0.040 s^-1). The points fall on a
// straight line through the origin: relative initial rate (1/t) is directly proportional to the
// volume (so to [Na2S2O3]) - first order, m = 1.
// Contract: docs/SCENE_CONTRACT.md
export default function createScene(ctx) {
  const { THREE, kit, page } = ctx;
  const { palette } = kit;
  const group = new THREE.Group();
  const NA = kit.chem('Na2S2O3');

  // ---------------------------------------------------------------- data (page 5 table)
  const ROWS = [[5.0, 181], [10.0, 91], [15.0, 61], [20.0, 45], [25.0, 36], [30.0, 30]].map(([v, t]) => ({ v, t, inv: 1 / t, invStr: (1 / t).toPrecision(2) }));
  // best straight line through the origin (least squares): 1/t = K * V
  const K = ROWS.reduce((a, r) => a + r.v * r.inv, 0) / ROWS.reduce((a, r) => a + r.v * r.v, 0);

  // ---------------------------------------------------------------- timeline
  const STEPS = [
    { duration: 4, caption: 'Data from the disappearing-cross experiment (page 5)' },
    { duration: 5, caption: 'rate ∝ 1/time, so use 1/t as the relative initial rate' },
    { duration: 4, caption: `Total volume is constant, so volume of ${NA} ∝ [${NA}]` },
    { duration: 9, caption: 'Each experiment becomes one point (volume, 1/t)' },
    { duration: 4, caption: 'The points lie on a straight line through the origin' },
    { duration: 4, caption: `Only the change matters: rate ∝ [${NA}], so m = 1 (first order)` },
  ];
  const T = kit.totalDuration(STEPS); // 30 s
  const captions = kit.captionTrack(ctx, STEPS);

  // opacity registry (individual fades x global loop fade)
  const faded = [];
  const alpha = new Map();
  const reg = (o) => { faded.push(o); return o; };
  const fade = (o, a) => alpha.set(o, a);

  // ---------------------------------------------------------------- graph aligned to the printed one
  // printed axes (measured on the page image): origin (u 0.2787, v 0.4664), x = 35 at u 0.7783,
  // y = 0.040 at v 0.2392
  const O = page.uvToXY(0.2787, 0.4664);
  const XM = page.uvToXY(0.7783, 0.4664);
  const YM = page.uvToXY(0.2787, 0.2392);
  const plotW = XM.x - O.x, plotH = YM.y - O.y;
  const M = { left: 0.118, right: 0.035, top: 0.03, bottom: 0.082 };
  const GW = plotW + M.left + M.right, GH = plotH + M.top + M.bottom;
  const graph = new kit.Graph2D({
    width: GW, height: GH, margin: M, fontSize: 0.022, backgroundOpacity: 0.985,
    x: { min: 0, max: 35, ticks: 5, format: (v) => (v === 0 ? '' : v.toFixed(1)) },
    y: { min: 0, max: 0.04, ticks: 0.005, format: (v) => (v === 0 ? '0' : v.toFixed(3)) },
  });
  graph.position.set(O.x + GW / 2 - M.left, O.y + GH / 2 - M.bottom, 0.006);
  group.add(graph);
  const toGroup = (x, y, z = 0) => { const p = graph.toLocal(x, y); return new THREE.Vector3(p.x + graph.position.x, p.y + graph.position.y, graph.position.z + z); };
  const panelChildren = [...graph.children]; // background, grid, axes, ticks (faded only with the loop)
  const yUnit = plotH / 0.04, xUnit = plotW / 35;
  const xLabel = graph.label('Volume (cm^3)', 17.5, -0.06 / yUnit, { size: 0.024, weight: 700, color: palette.ink });
  const yLabel = graph.label('Relative initial rate (s^-1)', -0.1 / xUnit, 0.02, { size: 0.024, weight: 700, color: palette.ink });
  yLabel.rotation.z = Math.PI / 2;
  reg(xLabel); reg(yLabel);

  const markers = ROWS.map((r) => reg(graph.point(r.v, r.inv, { color: palette.primary, radius: 0.0085 })));
  const hGuides = ROWS.map((r) => reg(graph.hline(r.inv, { toX: r.v, color: palette.primary, width: 0.0028 })));
  const vGuides = ROWS.map((r) => reg(graph.vline(r.v, { toY: r.inv, color: palette.primary, width: 0.0028 })));
  const fitLine = reg(graph.plot([[5, 5 * K], [30, 30 * K]], { color: palette.danger, width: 0.0055 }));
  const ghost = reg(graph.plot([[5, 5 * K], [0, 0]], { color: palette.danger, width: 0.004, dashed: true }));
  const concl = reg(graph.label(`rate ∝ [${NA}]\nm = 1 (first order)`, 1.5, 0.0335, {
    size: 0.027, align: 'left', background: palette.panel, border: palette.danger, weight: 800, color: palette.ink,
  }));
  for (const c of panelChildren) reg(c);

  // ---------------------------------------------------------------- floating table (blank area under the graph)
  const TB = { x: -0.03, top: -0.135, w: 0.62, head: 0.085, row: 0.05 };
  const COLX = [-0.215, -0.035, 0.165];
  const rowY = (k) => TB.top - TB.head - TB.row * (k + 0.5);
  const TZ = 0.012;
  const tableH = TB.head + TB.row * 6 + 0.012;
  const tablePanel = reg(new kit.Panel({ width: TB.w, height: tableH, color: palette.panel, opacity: 0.95, border: palette.panelEdge }));
  tablePanel.position.set(TB.x, TB.top - tableH / 2, TZ - 0.004);
  group.add(tablePanel);
  // grid lines
  const gridLines = reg(new THREE.Group());
  const hl = (y) => new kit.Ribbon([[TB.x - TB.w / 2 + 0.01, y], [TB.x + TB.w / 2 - 0.01, y]], { width: 0.0022, color: palette.panelEdge });
  gridLines.add(hl(TB.top - TB.head));
  for (const xx of [-0.125, 0.06]) gridLines.add(new kit.Ribbon([[xx, TB.top - 0.01], [xx, TB.top - tableH + 0.008]], { width: 0.0022, color: palette.panelEdge }));
  gridLines.position.z = TZ - 0.002;
  group.add(gridLines);
  // headers
  const mkHead = (text, x, color = palette.ink) => {
    const l = reg(new kit.Label(text, { size: 0.025, weight: 800, color, lineHeight: 1.15 }));
    l.position.set(x, TB.top - TB.head / 2, TZ);
    group.add(l);
    return l;
  };
  const hVol = mkHead(`Volume of\n${NA} (cm^3)`, COLX[0]);
  const hTime = mkHead('Time t\n(s)', COLX[1]);
  const hInv = mkHead('1/t\n(s^-1)', COLX[2], palette.secondary);
  // cells
  const cells = ROWS.map((r, k) => {
    const mk = (text, x, color = palette.ink) => { const l = reg(new kit.Label(text, { size: 0.031, weight: 600, color })); l.position.set(x, rowY(k), TZ); group.add(l); return l; };
    return { vol: mk(r.v.toFixed(1), COLX[0]), time: mk(String(r.t), COLX[1]), inv: mk(r.invStr, COLX[2], palette.secondary) };
  });
  // row highlight bar
  const rowHL = reg(new kit.Panel({ width: TB.w - 0.02, height: TB.row - 0.006, color: palette.accent, opacity: 0.32, radius: 0.008 }));
  rowHL.position.set(TB.x, rowY(0), TZ - 0.003);
  group.add(rowHL);

  // proxy tags between graph and table
  const tagRate = reg(new kit.Label('rate ∝ 1/t', { size: 0.03, background: palette.secondary, color: '#ffffff', weight: 800 }));
  tagRate.position.set(COLX[2], TB.top + 0.043, TZ + 0.004);
  group.add(tagRate);
  const tagVol = reg(new kit.Label(`volume ∝ [${NA}]`, { size: 0.028, background: palette.primary, color: '#ffffff', weight: 800 }));
  tagVol.position.set(COLX[0] - 0.02, TB.top + 0.043, TZ + 0.004);
  group.add(tagVol);
  const tagTotal = reg(new kit.Label('(total volume constant)', { size: 0.022, color: palette.primary, weight: 700 }));
  tagTotal.position.set(COLX[0] - 0.02, TB.top + 0.012, TZ + 0.004);
  group.add(tagTotal);

  // highlight of the printed rate equation for the conclusion
  const eqRect = reg(new kit.HighlightRect(page.bboxToRect([0.13, 0.068, 0.56, 0.092]), { color: palette.danger, fillOpacity: 0.16 }));
  group.add(eqRect);

  // flying points (3D spheres that arc off the page)
  const sphGeo = new THREE.SphereGeometry(0.012, 20, 14);
  const flyers = ROWS.map(() => { const m = reg(new THREE.Mesh(sphGeo, new THREE.MeshStandardMaterial({ color: palette.primary, roughness: 0.35 }))); group.add(m); return m; });
  const FLY0 = 13.3, FLY_DT = 1.45, FLY_DUR = 1.1;
  const startOf = (k) => new THREE.Vector3(COLX[2], rowY(k), TZ + 0.012);
  const endOf = (k) => toGroup(ROWS[k].v, ROWS[k].inv, 0.012);
  const tmp = new THREE.Vector3();

  return {
    group,
    update(t) {
      const lt = kit.loop(t, T);
      const s = captions(t);
      alpha.clear();
      const G = Math.min(kit.invLerp(0, 0.5, lt), 1 - kit.invLerp(T - 0.6, T, lt));

      // step 1: table (vol, time) + empty axes
      // step 2: 1/t column filled row by row
      fade(hInv, kit.invLerp(4.0, 4.4, lt));
      fade(tagRate, kit.envelope(lt, 4.2, 22.4, 0.4) * (0.75 + 0.25 * Math.sin(lt * 5)));
      let hlRow = -1, hlA = 0;
      ROWS.forEach((r, k) => {
        const tc = 4.6 + 0.7 * k;
        fade(cells[k].inv, kit.invLerp(tc, tc + 0.3, lt));
        const pop = kit.invLerp(tc, tc + 0.45, lt);
        cells[k].inv.scale.setScalar(pop > 0 && pop < 1 ? 1 + 0.3 * Math.sin(pop * Math.PI) : 1);
        if (lt >= tc - 0.1 && lt < tc + 0.7) { hlRow = k; hlA = 1; }
      });
      // step 3: volume proxy
      fade(tagVol, kit.envelope(lt, 9.2, 22.4, 0.4) * (0.75 + 0.25 * Math.sin(lt * 5 + 1)));
      fade(tagTotal, kit.envelope(lt, 9.6, 22.4, 0.4));
      if (lt >= 26.2) { xLabel.setText(`Volume (cm^3)  ∝  [${NA}]`); yLabel.setText('1/t (s^-1)  ∝  rate'); }
      else if (lt >= 9.8) { xLabel.setText('Volume of sodium thiosulphate solution used (cm^3)'); yLabel.setText('Relative initial rate (s^-1)'); }
      else { xLabel.setText('Volume (cm^3)'); yLabel.setText('Relative initial rate (s^-1)'); }
      const swap = lt >= 26.2 ? kit.invLerp(26.2, 26.6, lt) : lt >= 9.8 ? kit.invLerp(9.8, 10.2, lt) : 1;
      fade(xLabel, swap); fade(yLabel, lt >= 26.2 ? swap : 1);

      // step 4: points fly from the table to the graph
      ROWS.forEach((r, k) => {
        const t0 = FLY0 + FLY_DT * k;
        const f = kit.invLerp(t0, t0 + FLY_DUR, lt);
        const flying = lt >= t0 && lt < t0 + FLY_DUR;
        flyers[k].visible = flying;
        if (flying) {
          const e = kit.ease.inOutCubic(f);
          tmp.copy(startOf(k)).lerp(endOf(k), e);
          tmp.z += 0.17 * Math.sin(Math.PI * e);
          flyers[k].position.copy(tmp);
        }
        fade(flyers[k], flying ? 1 : 0);
        const landed = kit.invLerp(t0 + FLY_DUR - 0.05, t0 + FLY_DUR + 0.1, lt);
        fade(markers[k], landed);
        const g = kit.envelope(lt, t0 + FLY_DUR, t0 + FLY_DUR + 1.6, 0.3);
        fade(hGuides[k], g); fade(vGuides[k], g);
        if (lt >= t0 - 0.15 && lt < t0 + FLY_DUR + 0.3) { hlRow = k; hlA = 1; }
      });
      if (hlRow >= 0) rowHL.position.y = rowY(hlRow);
      fade(rowHL, hlA);

      // step 5: straight line through the points, dotted back to the origin
      fitLine.setProgress(kit.tween(lt, 22.2, 1.6));
      fade(fitLine, lt >= 22.2 ? 1 : 0);
      ghost.setProgress(kit.tween(lt, 24.0, 1.0)); // drawn from the 5.0 point back to the origin
      fade(ghost, kit.invLerp(24.0, 24.2, lt));
      // step 6: conclusion
      fade(concl, kit.invLerp(26.6, 27.1, lt));
      fade(eqRect, kit.invLerp(26.6, 27.1, lt));
      eqRect.update(t);

      for (const o of faded) kit.setOpacity(o, (alpha.has(o) ? alpha.get(o) : 1) * G);
    },
    dispose() {
      kit.disposeObject(group);
    },
  };
}
