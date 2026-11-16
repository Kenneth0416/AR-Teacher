// Consistent colours for all scenes. Chosen to read on white paper AND over a busy camera feed:
// saturated mid-tones (not pastel, not near-black) plus a near-white panel backing for 2D content.
export const palette = {
  ink: '#1b1f24',        // main text / axes on light panels
  inkSoft: '#57606a',    // secondary text, ticks
  grid: '#c8ced6',       // grid lines on panels
  panel: '#ffffff',      // panel / label backing (use with opacity ~0.88)
  panelEdge: '#9aa4b1',
  white: '#ffffff',

  primary: '#1f6feb',    // main curve / highlight (blue)
  secondary: '#e8590c',  // second curve (orange)
  tertiary: '#2f9e44',   // third curve (green)
  quaternary: '#9c36b5', // fourth (purple)
  accent: '#f59f00',     // attention / highlight rectangles (amber)
  danger: '#e03131',     // warnings / "wrong" (red)

  // chemistry species (particle box, legends)
  species: ['#e03131', '#1f6feb', '#2f9e44', '#f59f00', '#9c36b5', '#0c8599'],
  reactant: '#e03131',
  product: '#2f9e44',
  catalyst: '#9c36b5',

  // liquids / glass
  glass: '#dbe7f3',
  water: '#74c0fc',
  iodineBlue: '#1c2a8a',   // starch-iodine blue-black
  sulfurYellow: '#f2e394', // sulphur precipitate
  gas: '#e9f3ff',
};

/** Ordered list for multiple series on one graph. */
export const seriesColors = [palette.primary, palette.secondary, palette.tertiary, palette.quaternary, palette.danger];
