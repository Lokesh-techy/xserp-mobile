/** @author Lokesh */
/**
 * 0..1 brightness for petal `index` at wave phase `wave` (0..1, looping). Each petal peaks a quarter
 * cycle after the previous one, so light passes around the X while it loads.
 */
export const petalPulse = (wave: number, index: number) => {
  'worklet';
  // Raised cosine: a smooth, continuous swell (never a hard on/off), peaking once per cycle.
  const v = (1 + Math.sin(2 * Math.PI * (wave - index / 4))) / 2;
  return v * v;
};
