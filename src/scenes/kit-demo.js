// Kit demo (?mode=preview&page=kit): exercises every kit building block. Also a living example
// for scene authors - see docs/SCENE_CONTRACT.md.
export default function createScene(ctx) {
  const { THREE, kit, page } = ctx;
  const { palette } = kit;
  const group = new THREE.Group();

  const STEPS = [
    { duration: 4, caption: 'Graph2D: the O_2 volume curve draws on as gas collects' },
    { duration: 3, caption: 'Tangent at t = 0 gives the initial rate' },
    { duration: 5, caption: kit.chem('ParticleBox: 2H2O2 -> 2H2O + O2 (red -> green)') },
  ];
  const captions = kit.captionTrack(ctx, STEPS);
  const T = kit.totalDuration(STEPS);
  const V = (t) => 80 * (1 - Math.exp(-t / 3)); // cm3 O2 collected after t s (demo kinetics)

  // --- highlight a page region (normalised bbox from the spec, here a literal) ---
  const hl = new kit.HighlightRect(page.bboxToRect([0.04, 0.03, 0.96, 0.43]), { color: palette.accent });
  group.add(hl);

  // --- Graph2D, flat on the page ---
  const graph = new kit.Graph2D({
    width: 0.86, height: 0.5,
    x: { min: 0, max: 12, ticks: 2, label: 'time / s' },
    y: { min: 0, max: 100, ticks: 20, label: 'volume of O_2 / cm^3' },
    title: 'Volume of O_2 against time',
  });
  graph.position.set(0, 0.37, 0.004);
  group.add(graph);
  const curve = graph.plot(V, { color: palette.primary });
  const tip = graph.point(0, 0, { color: palette.primary });
  const tangent = graph.tangent(V, 0, { span: 5.5, color: palette.danger });
  const tanLabel = graph.label('initial rate = slope ≈ 27 cm^3 s^-1', 6.5, 30, { color: palette.danger, size: 0.022, halo: true });
  graph.points([[2, V(2)], [4, V(4)], [6, V(6)], [8, V(8)], [10, V(10)]], { color: palette.secondary, radius: 0.007 });

  // --- conical flask with bubbles -> gas syringe ---
  const flask = new kit.ConicalFlask({ radius: 0.07, neck: 0.02, height: 0.15, level: 0.35, liquidColor: palette.water });
  flask.position.set(-0.32, 0.0, 0);
  const bubbles = new kit.Bubbles({ radius: 0.05, height: 0.045, count: 30, size: 0.004 });
  flask.add(bubbles);
  group.add(flask);
  const syringe = new kit.GasSyringe({ length: 0.5, radius: 0.03, maxVolume: 100, majorTick: 20 });
  syringe.position.set(0.12, 0.0, 0);
  group.add(syringe);
  const arrow = new kit.Arrow({ from: [-0.26, 0.0, 0.17], to: [-0.12, 0.0, 0.08], color: palette.accent });
  group.add(arrow);
  const flaskLabel = new kit.Label(kit.chem('H2O2(aq) + MnO2'), { size: 0.03, billboard: true, background: palette.panel });
  flaskLabel.position.set(-0.32, 0.0, 0.22);
  group.add(flaskLabel);
  const volLabel = new kit.Label('', { size: 0.032, billboard: true, background: palette.panel, color: palette.primary });
  volLabel.position.set(0.12, 0.0, 0.13);
  group.add(volLabel);

  // --- particle box: A -> B conversion ---
  const box = new kit.ParticleBox({
    size: [0.34, 0.26, 0.18], seed: 5, speed: 0.12,
    species: [
      { name: 'H2O2', color: palette.reactant, radius: 0.013, count: 24 },
      { name: 'O2', color: palette.product, radius: 0.011, count: 0, max: 24 },
    ],
  });
  box.position.set(-0.27, -0.42, 0);
  group.add(box);
  const boxLabel = new kit.Label(kit.chem('[H2O2] / mol dm^-3'), { size: 0.026, background: palette.panel });
  boxLabel.position.set(-0.27, -0.58, 0.004);
  group.add(boxLabel);

  // --- beaker + test tube ---
  const beaker = new kit.Beaker({ radius: 0.07, height: 0.15, level: 0.6, liquidColor: palette.sulfurYellow, liquidOpacity: 0.4 });
  beaker.position.set(0.14, -0.42, 0);
  group.add(beaker);
  const tube = new kit.TestTube({ radius: 0.02, height: 0.17, level: 0.5, liquidColor: palette.iodineBlue });
  tube.position.set(0.36, -0.42, 0);
  group.add(tube);
  const tubeLabel = new kit.Label('Test tube 3', { size: 0.026, billboard: true });
  tubeLabel.position.set(0.36, -0.42, 0.22);
  group.add(tubeLabel);

  return {
    group,
    update(t) {
      const lt = kit.loop(t, T);
      const s = captions(t);
      // graph: draw-on over the first step, tangent in the second
      const p = s.index === 0 ? s.local : 1;
      curve.setProgress(p);
      const xTip = p * 12;
      tip.setData(xTip, V(xTip));
      tangent.setProgress(s.index >= 1 ? kit.tween(lt, 4, 1.2) : 0);
      kit.setOpacity(tanLabel, s.index >= 1 ? kit.invLerp(4.8, 5.4, lt) : 0);
      hl.update(t);
      // apparatus follows the same kinetics as the graph
      const tt = s.index === 0 ? xTip : 12;
      syringe.setVolume(V(tt));
      volLabel.setText(kit.fmt(`V(O_2) = ${V(tt).toFixed(0)} cm^3`));
      bubbles.setIntensity(Math.exp(-tt / 3)).update(t);
      arrow.setProgress(kit.pingpong(t, 2) * 0.6 + 0.4);
      // particles convert during step 3
      const k = s.index === 2 ? Math.round(kit.ease.outCubic(s.local) * 20) : 0;
      box.setCounts({ H2O2: 24, O2: 0 }).setConverted('H2O2', 'O2', k).update(t);
      // beaker turns cloudy, tube level wobbles
      beaker.setLiquidOpacity(0.35 + 0.6 * kit.pingpong(t, 6));
      tube.setLevel(0.45 + 0.1 * Math.sin(t));
    },
    dispose() {
      kit.disposeObject(group);
    },
  };
}
