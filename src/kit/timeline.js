// Timeline helpers. Scenes should be PURE functions of t (seconds since mount) so that ?t=12.5
// freezing, restarting and screenshot tests are exact.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, f) => a + (b - a) * f;
/** Inverse lerp, clamped: where x lies between a and b as 0..1. */
export const invLerp = (a, b, x) => clamp((x - a) / (b - a || 1e-9));
/** Map x from [a0,a1] to [b0,b1] (clamped). */
export const remap = (x, a0, a1, b0, b1) => lerp(b0, b1, invLerp(a0, a1, x));
export const smoothstep = (a, b, x) => { const f = invLerp(a, b, x); return f * f * (3 - 2 * f); };

export const ease = {
  linear: (f) => f,
  inQuad: (f) => f * f,
  outQuad: (f) => 1 - (1 - f) * (1 - f),
  inOutQuad: (f) => (f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2),
  inCubic: (f) => f ** 3,
  outCubic: (f) => 1 - (1 - f) ** 3,
  inOutCubic: (f) => (f < 0.5 ? 4 * f ** 3 : 1 - (-2 * f + 2) ** 3 / 2),
  inOutSine: (f) => -(Math.cos(Math.PI * f) - 1) / 2,
  outBack: (f) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (f - 1) ** 3 + c1 * (f - 1) ** 2; },
  outElastic: (f) => (f === 0 || f === 1 ? f : 2 ** (-10 * f) * Math.sin((f * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

/** Time within a loop of length `duration`: loop(t, 10) in [0, 10). */
export const loop = (t, duration) => (duration > 0 ? ((t % duration) + duration) % duration : 0);
/** Back-and-forth 0..1..0 with the given period. */
export const pingpong = (t, period) => { const f = loop(t, period) / period; return f < 0.5 ? f * 2 : 2 - f * 2; };

/**
 * Progress 0..1 of an interval [start, start + duration], eased: tween(t, 2, 1.5, ease.outCubic).
 */
export const tween = (t, start, duration, e = ease.inOutCubic) => e(clamp((t - start) / (duration || 1e-9)));

/**
 * Visibility envelope: 0 before `start`, fades in over `fade`, 1 until `end`, fades out over `fade`.
 * Use with kit.setOpacity(obj, envelope(t, 2, 8)).
 */
export const envelope = (t, start, end, fade = 0.4) => Math.min(invLerp(start, start + fade, t), 1 - invLerp(end - fade, end, t));

/** Sum of step durations. */
export const totalDuration = (steps) => steps.reduce((a, s) => a + (s.duration ?? 0), 0);

/**
 * Which step is active at time t. steps = [{ duration, ...anything }]. Returns
 *   { index, step, local (0..1 within the step), elapsed (s into the step), start, end, total }
 * t beyond the end -> last step with local = 1; t < 0 -> first step with local = 0.
 *
 *   const STEPS = [{ duration: 3, caption: 'Add acid' }, { duration: 4, caption: 'Time the cross' }];
 *   const s = stepAt(loop(t, totalDuration(STEPS)), STEPS);
 */
export function stepAt(t, steps) {
  const total = totalDuration(steps);
  let start = 0;
  for (let i = 0; i < steps.length; i++) {
    const d = steps[i].duration ?? 0;
    if (t < start + d || i === steps.length - 1) {
      const local = clamp((t - start) / (d || 1e-9));
      return { index: i, step: steps[i], local, elapsed: clamp(t - start, 0, d), start, end: start + d, total };
    }
    start += d;
  }
  return { index: -1, step: null, local: 0, elapsed: 0, start: 0, end: 0, total };
}

/**
 * A looping timeline object: const tl = timeline(STEPS, { loop: true });
 *   tl.total; tl.at(t) -> stepAt(...) result (+ .t = looped time, .cycle = loop count)
 */
export function timeline(steps, { loop: doLoop = true } = {}) {
  const total = totalDuration(steps);
  return {
    steps, total,
    at(t) {
      const lt = doLoop ? loop(t, total) : t;
      const r = stepAt(lt, steps);
      r.t = lt;
      r.cycle = doLoop && total > 0 ? Math.floor(t / total) : 0;
      return r;
    },
  };
}

/**
 * Caption driver: calls ctx.setCaption only when the text changes. Steps may carry `caption`
 * (string or (localProgress) => string).
 *   const captions = captionTrack(ctx, STEPS);      // in createScene
 *   captions(t);                                    // in update(t) (loops over the total duration)
 */
export function captionTrack(ctx, steps, { loop: doLoop = true } = {}) {
  const tl = timeline(steps, { loop: doLoop });
  let last = null;
  const fn = (t) => {
    const s = tl.at(t);
    const c = s.step?.caption;
    const text = typeof c === 'function' ? c(s.local, s) : c ?? '';
    if (text !== last) { last = text; ctx.setCaption(text); }
    return s;
  };
  fn.timeline = tl;
  return fn;
}
