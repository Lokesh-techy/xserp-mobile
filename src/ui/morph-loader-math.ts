/** @author Lokesh */
// Geometry and timing for the letters-into-a-ring button loader. Worklet-safe (pure math).

export const ringRadius = (letters: number) => {
  'worklet';
  return Math.max(8, Math.min(16, letters * 1.3));
};

export const ringPoint = (i: number, n: number, r: number) => {
  'worklet';
  const a = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, n);
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
};

/** One revolution with ease-in-out: a flick that gathers speed and settles, like a hand-spun dial. */
export const humanSpin = (t: number) => {
  'worklet';
  const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  return 360 * e;
};
