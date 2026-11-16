// Page 8 - Iodine clock: a race of four test tubes, then 1/t against volume of H2O2.
//
// Four tubes stand in a rack at the foot of the page. Each receives 25.0 cm3 of liquid made of
// 1.0 / 2.0 / 3.0 / 4.0 cm3 of 0.2 M H2O2(aq) topped up with 24.0 / 23.0 / 22.0 / 21.0 cm3 of
// distilled water. On ONE shared stopwatch (running 6x faster than real time, real seconds shown)
// each tube turns dark blue SUDDENLY at 20, 27, 40 and 78 s, and the matching printed table row
// lights up. Then 1/t values fly onto a graph registered over the printed one (x 0-5 cm3,
// y 0-0.0600 s^-1): a straight line through the origin -> first order with respect to H2O2(aq).
// Contract: docs/SCENE_CONTRACT.md
export default function createScene(ctx) {
  const { THREE, kit, page } = ctx;
  const P = kit.palette;
  const group = new THREE.Group();

  // ---------------------------------------------------------------- data (from the page) ----
  const TUBES = [
    { n: 1, v: 1.0, w: 24.0, time: 78, inv: 0.0128, ord: '4th' },
    { n: 2, v: 2.0, w: 23.0, time: 40, inv: 0.025, ord: '3rd' },
    { n: 3, v: 3.0, w: 22.0, time: 27, inv: 0.037, ord: '2nd' },
    { n: 4, v: 4.0, w: 21.0, time: 20, inv: 0.05, ord: '1st' },
  ];

  // ---------------------------------------------------------------- timeline ----------------
  const STEPS = [
    { duration: 5, caption: 'Same total volume (25.0 cm^3); more 0.2 M H_2O_2 from tube 1 to tube 4' },
    { duration: 3, caption: 'Start: all four are mixed at t = 0 (the clock runs 6× faster than real time)' },
    { duration: 5, caption: (f, s) => raceCaption(s.start + s.elapsed, 0) },
    { duration: 8, caption: (f, s) => raceCaption(s.start + s.elapsed, 1) },
    { duration: 6, caption: 'Plot 1/t (∝ rate) against volume of H_2O_2 added (∝ [H_2O_2])' },
    { duration: 4, caption: 'Straight line through the origin: 1/t ∝ volume of H_2O_2' },
    { duration: 5, caption: 'First order with respect to H_2O_2(aq)' },
  ];
  const T = kit.totalDuration(STEPS); // 36 s
  const captions = kit.captionTrack(ctx, STEPS);

  const SPEED = 6;          // experiment seconds per animation second
  const T_MIX = 7.0;        // animation time at which the clock starts (t = 0 s)
  const T_REWIND = 35.0;    // loop rewind starts
  const finishAt = (d) => T_MIX + d.time / SPEED; // 10.33, 11.5, 13.67, 20.0
  const clock = (lt) => (lt >= T_REWIND - 0.1 ? 0 : kit.clamp((lt - T_MIX) * SPEED, 0, 78));

  function raceCaption(lt, part) {
    const c = clock(lt);
    if (part === 0) {
      if (c < 20) return 'Watch the clock: nothing seems to happen at first…';
      if (c < 27) return 'Tube 4 (most H_2O_2) suddenly turns dark blue at 20 s';
      return 'Tube 3 turns dark blue at 27 s';
    }
    if (c < 40) return 'Tubes 1 and 2 are still colourless…';
    if (c < 78) return 'Tube 2 turns dark blue at 40 s';
    return 'Tube 1 (least H_2O_2) is last: 78 s. Less H_2O_2, longer time';
  }

  // ---------------------------------------------------------------- layout ------------------
  const RACK_Y = -0.40;              // tube axis y
  const XS = [-0.36, -0.12, 0.12, 0.36];
  const BASE_Z = 0.012;              // rack base plate thickness (tubes stand on it)
  const TUBE_H = 0.25, TUBE_R = 0.024;
  const LEVEL_PRE = 0.33, LEVEL_POST = 0.66;
  const PRE_COLOR = new THREE.Color('#d9eef9');
  const BLUE = new THREE.Color(P.iodineBlue);

  // --- rack: base plate + top plate with four holes + two end posts ---
  const wood = new THREE.MeshStandardMaterial({ color: '#c99a6b', roughness: 0.75 });
  const RACK_W = 0.94, RACK_D = 0.11, TOP_Z = 0.05, TOP_T = 0.01;
  const base = new THREE.Mesh(new THREE.BoxGeometry(RACK_W, RACK_D, BASE_Z), wood);
  base.position.set(0, RACK_Y - 0.01, BASE_Z / 2);
  group.add(base);
  const plateShape = kit.roundedRectShape(RACK_W, RACK_D, 0.01);
  for (const x of XS) {
    const hole = new THREE.Path();
    hole.absarc(x, 0.01, TUBE_R + 0.005, 0, Math.PI * 2, true);
    plateShape.holes.push(hole);
  }
  const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(plateShape, { depth: TOP_T, bevelEnabled: false, curveSegments: 24 }), wood);
  plate.position.set(0, RACK_Y - 0.01, TOP_Z);
  group.add(plate);
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.014, RACK_D, TOP_Z), wood);
    post.position.set(sx * (RACK_W / 2 - 0.007), RACK_Y - 0.01, TOP_Z / 2);
    group.add(post);
  }

  // --- tubes, pour-in portions, labels ---
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 24);
  cylGeo.rotateX(Math.PI / 2);   // axis along +Z
  cylGeo.translate(0, 0, 0.5);   // base at z = 0
  const h2o2Mat = new THREE.MeshStandardMaterial({ color: P.reactant, roughness: 0.4, transparent: true, opacity: 0.85 });
  const waterMat = new THREE.MeshStandardMaterial({ color: P.water, roughness: 0.3, transparent: true, opacity: 0.6, depthWrite: false });
  const streamMat = new THREE.MeshStandardMaterial({ color: '#f4b6b6', roughness: 0.3, transparent: true, opacity: 0.7, depthWrite: false });
  const PORTION_Z = BASE_Z + TUBE_H + 0.025;
  const PER_CM3 = 0.0048; // portion column height per cm3 (25.0 cm3 -> 0.12)
  const tubes = TUBES.map((d, i) => {
    const x = XS[i];
    const tube = new kit.TestTube({ radius: TUBE_R, height: TUBE_H, level: LEVEL_PRE, liquidColor: PRE_COLOR, liquidOpacity: 0.4 });
    tube.position.set(x, RACK_Y, BASE_Z);
    // kit workaround: glass (2) / liquid (1) would be overdrawn by the flat graph panel (10-15)
    // where the tall tubes overlap it on screen; draw the tubes after the panel instead.
    tube.liquid.renderOrder = 16;
    tube.glass.renderOrder = 17;
    group.add(tube);

    // the 25.0 cm3 portion waiting above the tube: H2O2 (red, bottom) + water (blue, top)
    const portion = new THREE.Group();
    portion.position.set(x, RACK_Y, PORTION_Z);
    const ph = new THREE.Mesh(cylGeo, h2o2Mat);
    ph.scale.set(0.016, 0.016, d.v * PER_CM3);
    const pw = new THREE.Mesh(cylGeo, waterMat);
    pw.scale.set(0.016, 0.016, d.w * PER_CM3);
    pw.position.z = d.v * PER_CM3;
    portion.add(ph, pw);
    group.add(portion);
    const stream = new THREE.Mesh(cylGeo, streamMat);
    stream.position.set(x, RACK_Y, 0);
    stream.visible = false;
    group.add(stream);

    // tube number on the front strip of the rack
    const num = new kit.Label(String(d.n), { size: 0.03, weight: 800, halo: false, color: '#3b2a1a' });
    num.position.set(x + (x < 0 ? 0.05 : -0.05), RACK_Y - 0.035, TOP_Z + TOP_T + 0.001);
    group.add(num);

    // volumes (flat in front of the rack)
    const lh = new kit.Label(`${d.v.toFixed(1)} cm^3 H_2O_2`, { size: 0.026, color: '#c92a2a', weight: 700 });
    lh.position.set(x, RACK_Y - 0.105, 0.004);
    const lw = new kit.Label(`${d.w.toFixed(1)} cm^3 water`, { size: 0.024, color: '#1864ab', weight: 600 });
    lw.position.set(x, RACK_Y - 0.14, 0.004);
    group.add(lh, lw);

    // result (billboard over the tube)
    const res = new kit.Label(`${d.time} s  (${d.ord})\n1/t = ${d.inv.toFixed(4)} s^-1`, {
      size: 0.025, billboard: true, background: P.panel, border: P.iodineBlue, color: P.ink, weight: 700,
    });
    res.position.set(x, RACK_Y + 0.11, BASE_Z + TUBE_H + 0.05);
    group.add(res);
    return { d, x, tube, portion, stream, lh, lw, res, t: finishAt(d) };
  });


  // --- stopwatch (tilted towards the reader so it reads from the front AND the top) ---
  const SW_R = 0.12;
  const sw = new THREE.Group();
  sw.position.set(0, 0.05, 0.13);
  sw.rotation.x = 0.7;
  group.add(sw);
  const swBody = new THREE.Mesh(new THREE.CylinderGeometry(SW_R + 0.012, SW_R + 0.012, 0.024, 48), new THREE.MeshStandardMaterial({ color: '#495057', roughness: 0.4, metalness: 0.3 }));
  swBody.rotation.x = Math.PI / 2;
  sw.add(swBody);
  const face = new THREE.Mesh(new THREE.CircleGeometry(SW_R, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }));
  face.position.z = 0.0125;
  sw.add(face);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 16), new THREE.MeshStandardMaterial({ color: '#868e96', roughness: 0.4, metalness: 0.4 }));
  crown.position.set(0, SW_R + 0.025, 0);
  sw.add(crown);
  const tickMat = new THREE.MeshBasicMaterial({ color: P.ink, toneMapped: false });
  const DIAL_MAX = 80; // one turn = 80 s
  const angleOf = (s) => -(s / DIAL_MAX) * Math.PI * 2;
  for (let s = 0; s < DIAL_MAX; s += 5) {
    const major = s % 10 === 0;
    const len = major ? 0.018 : 0.009;
    const tk = new THREE.Mesh(new THREE.PlaneGeometry(major ? 0.004 : 0.0025, len), tickMat);
    const a = angleOf(s);
    const r = SW_R - 0.006 - len / 2;
    tk.position.set(Math.sin(-a) * r, Math.cos(a) * r, 0.013);
    tk.rotation.z = a;
    sw.add(tk);
    if (s % 20 === 0) {
      const nl = new kit.Label(String(s), { size: 0.024, halo: false, color: P.inkSoft, weight: 700 });
      const rr = SW_R - 0.042;
      nl.position.set(Math.sin(-a) * rr, Math.cos(a) * rr, 0.0135);
      sw.add(nl);
    }
  }
  // finish marks on the rim (appear as each tube turns blue)
  const markGeo = new THREE.CircleGeometry(0.009, 20);
  const markMat = new THREE.MeshBasicMaterial({ color: P.iodineBlue, toneMapped: false });
  const marks = TUBES.map((d) => {
    const m = new THREE.Mesh(markGeo, markMat);
    const a = angleOf(d.time);
    const r = SW_R - 0.003;
    m.position.set(Math.sin(-a) * r, Math.cos(a) * r, 0.0142);
    sw.add(m);
    return m;
  });
  const handPivot = new THREE.Group();
  handPivot.position.z = 0.016;
  sw.add(handPivot);
  const hand = new THREE.Mesh(new THREE.PlaneGeometry(0.005, SW_R * 0.9), new THREE.MeshBasicMaterial({ color: P.danger, toneMapped: false }));
  hand.position.y = SW_R * 0.45 - 0.01;
  handPivot.add(hand);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.009, 20), new THREE.MeshBasicMaterial({ color: P.danger, toneMapped: false }));
  cap.position.z = 0.0005;
  handPivot.add(cap);
  const readout = new kit.Label('t = 0 s', { size: 0.036, weight: 800, background: P.ink, color: '#ffffff', bgOpacity: 0.92, align: 'left' });
  readout.position.set(SW_R + 0.025, 0, 0.015);
  sw.add(readout);
  const speedTag = new kit.Label('clock ×6', { size: 0.025, background: P.accent, color: P.ink, weight: 700, bgOpacity: 0.95, align: 'right' });
  speedTag.position.set(-SW_R - 0.02, -SW_R * 0.55, 0.015);
  sw.add(speedTag);

  // --- printed table: light up the time + 1/t cells of each row as the tube finishes ---
  const ROW_V0 = 0.189, ROW_DV = 0.0245;
  const rowHL = TUBES.map((d, i) => {
    const h = new kit.HighlightRect(page.bboxToRect([0.545, ROW_V0 + i * ROW_DV, 0.91, ROW_V0 + (i + 1) * ROW_DV]), {
      color: P.primary, fillOpacity: 0.22, lineWidth: 0.004, padding: 0.002, radius: 0.006, pulse: false,
    });
    group.add(h);
    return h;
  });

  // --- graph registered over the printed one: x 0..5 cm3, y 0..0.0600 s^-1 ---
  // printed plot area in page units: x(0) = -0.122, x(5) = 0.247, y(0) = -0.2536, y(0.06) = 0.2148
  const FS = 0.024, ML = 0.17, MR = 0.04, MB = 0.09, MT = 0.04;
  const GW = 0.369 + ML + MR, GH = 0.4684 + MB + MT;
  const graph = new kit.Graph2D({
    width: GW, height: GH, fontSize: FS, backgroundOpacity: 0.98,
    margin: { left: ML, right: MR, top: MT, bottom: MB },
    x: { min: 0, max: 5, ticks: 1, label: 'Volume of H_2O_2(aq) added (cm^3)' },
    y: { min: 0, max: 0.06, ticks: 0.01, label: '1/time (s^-1)', format: (v) => (v === 0 ? '0' : v.toFixed(4)) },
  });
  const GZ = 0.012;
  graph.position.set(-0.122 - (-GW / 2 + ML), -0.2536 - (-GH / 2 + MB), GZ);
  group.add(graph);
  const line = graph.plot([[0, 0], [4, 0.05]], { color: P.primary, width: 0.006 });
  const markers = TUBES.map((d) => graph.point(d.v, d.inv, { color: P.secondary, radius: 0.01 }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.012, 0.019, 32), new THREE.MeshBasicMaterial({ color: P.accent, transparent: true, toneMapped: false, depthWrite: false }));
  ring.position.copy(graph.toLocal(0, 0, 0.0048));
  graph.add(ring);
  const gWorld = (x, y, z = GZ + 0.01) => new THREE.Vector3(graph.position.x, graph.position.y, z).add(graph.toLocal(x, y, 0));

  // flying dots: tube -> graph point
  const dotGeo = new THREE.SphereGeometry(0.012, 20, 14);
  const dotMat = new THREE.MeshStandardMaterial({ color: P.secondary, roughness: 0.35, emissive: P.secondary, emissiveIntensity: 0.2 });
  const flights = TUBES.map((d, i) => {
    const m = new THREE.Mesh(dotGeo, dotMat);
    m.visible = false;
    group.add(m);
    const a = new THREE.Vector3(XS[i], RACK_Y, BASE_Z + TUBE_H + 0.01);
    const b = gWorld(d.v, d.inv);
    const c = a.clone().lerp(b, 0.5);
    c.z = 0.36;
    return { m, a, b, c, start: 21.8 + i * 0.7 };
  });
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();

  const conclusion = new kit.Label('rate ∝ [H_2O_2(aq)]\n⇒ first order with\nrespect to H_2O_2(aq)', {
    size: 0.03, background: P.panel, border: P.primary, color: P.ink, weight: 700, align: 'left', anchorY: 'top', bgOpacity: 0.95,
  });
  conclusion.position.set(0.04, -0.1, 0.03);
  group.add(conclusion);
  const lineTag = new kit.Label('straight line through (0, 0)', { size: 0.026, background: P.panel, color: P.primary, weight: 700, align: 'left' });
  lineTag.position.copy(gWorld(0.15, 0.054, 0.03));
  group.add(lineTag);

  // ---------------------------------------------------------------- update ------------------
  const env = kit.envelope;
  function update(t) {
    const lt = kit.loop(t, T);
    captions(t);
    const c = clock(lt);
    const regrow = kit.smoothstep(T_REWIND + 0.3, T, lt);            // portions come back

    // pour: 5.4 .. 6.9
    const pour = kit.tween(lt, 5.4, 1.5, kit.ease.inOutSine) * (1 - regrow);
    const pourAmt = lt >= T_REWIND ? 1 - regrow : pour;
    for (const tb of tubes) {
      const { tube, portion, stream, d } = tb;
      // portion drains into the tube
      const left = 1 - pourAmt;
      portion.scale.set(1, 1, Math.max(1e-4, left));
      portion.visible = left > 0.002;
      // stream while pouring
      const pouring = lt > 5.4 && lt < 6.9;
      stream.visible = pouring;
      const level = kit.lerp(LEVEL_PRE, LEVEL_POST, pourAmt);
      if (pouring) {
        const z0 = BASE_Z + level * TUBE_H;
        stream.position.z = z0;
        stream.scale.set(0.004, 0.004, Math.max(1e-4, PORTION_Z - z0));
      }
      tube.setLevel(level);
      // colour: sudden switch at the finish time (no gradual change)
      const done = lt >= tb.t && lt < T_REWIND;
      if (done) tube.setLiquidColor(BLUE).setLiquidOpacity(0.93);
      else tube.setLiquidColor(PRE_COLOR).setLiquidOpacity(0.4);
      // flash pulse on the change
      const k = done ? Math.exp(-(((lt - tb.t) / 0.25) ** 2)) : 0;
      tube.scale.set(1 + 0.18 * k, 1 + 0.18 * k, 1);
      // labels
      kit.setOpacity(tb.lw, env(lt, -1, 8.6, 0.6) + regrow);
      kit.setOpacity(tb.res, lt >= tb.t ? kit.invLerp(tb.t, tb.t + 0.25, lt) * (1 - kit.invLerp(20.9, 21.5, lt)) : 0);
    }

    // stopwatch
    const swA = Math.max(1 - kit.invLerp(21.0, 21.8, lt), regrow);
    kit.setOpacity(sw, swA);
    if (swA > 0) {
      handPivot.rotation.z = angleOf(c);
      readout.setText(`t = ${Math.floor(c + 1e-6)} s`);
      tubes.forEach((tb, i) => { marks[i].visible = lt >= tb.t && lt < T_REWIND; });
      kit.setOpacity(speedTag, kit.invLerp(5.0, 5.6, lt) * (1 - kit.invLerp(20.6, 21.2, lt)));
    }

    // printed table rows
    tubes.forEach((tb, i) => {
      const a = lt >= tb.t ? kit.invLerp(tb.t, tb.t + 0.3, lt) * (1 - kit.invLerp(34.6, 35.2, lt)) : 0;
      kit.setOpacity(rowHL[i], a);
    });

    // graph
    const gA = kit.invLerp(21.0, 21.8, lt) * (1 - kit.invLerp(34.6, 35.2, lt));
    kit.setOpacity(graph, gA);
    flights.forEach((f, i) => {
      const u = kit.clamp((lt - f.start) / 1.1);
      const flying = u > 0 && u < 1 && lt < 34.6;
      f.m.visible = flying;
      if (flying) {
        const e = kit.ease.inOutCubic(u);
        tmpA.copy(f.a).lerp(f.c, e);
        tmpB.copy(f.c).lerp(f.b, e);
        f.m.position.copy(tmpA.lerp(tmpB, e));
      }
      markers[i].visible = u >= 1;
    });
    line.setProgress(kit.tween(lt, 27.2, 2.2, kit.ease.inOutSine));
    const ringOn = lt > 27.0 && lt < 31.5;
    ring.visible = ringOn && gA > 0;
    if (ringOn) {
      const ph = ((lt - 27.0) % 1.0) / 1.0;
      ring.scale.setScalar(1 + 1.4 * ph);
      ring.material.opacity = (1 - ph) * gA;
    }
    kit.setOpacity(lineTag, env(lt, 28.0, 31.2, 0.4));
    kit.setOpacity(conclusion, env(lt, 31.2, 35.0, 0.5));
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
